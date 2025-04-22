import requests
from datetime import datetime, timedelta, timezone
import random
import logging
import base64
import json
from typing import List
from app.core.config import settings
from app.models.deployment import Deployment, DeploymentStatus, Environment

# Logger tanımla
logger = logging.getLogger(__name__)

class AzureDevOpsService:
    """
    Azure DevOps API ile iletişim kuran servis sınıfı
    """
    def __init__(self):
        self.base_url = settings.azure_base_url
        logger.info(f"Azure DevOps Service initialized with base URL: {self.base_url}")
        
        # NTLM ve Negotiate kimlik doğrulama protokollerini desteklemek için
        # requests_ntlm modülünü kullanmamız gerekiyor
        
        # Format 1: Normal PAT token (Bearer)
        self.headers = {
            "Authorization": f"Bearer {settings.azure_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        logger.info(f"Token formatı: Bearer")
        logger.info(f"Token değeri (ilk 5 karakter): {settings.azure_token[:5]}")
        
        # API erişilebilirliğini kontrol et
        self.api_accessible = self._check_api_access()
        
        # Eğer ilk format başarısız olursa Basic auth dene
        if not self.api_accessible:
            logger.info("Bearer token başarısız, Basic auth deneniyor...")
            
            # Format 2: Basic auth (username:password formatında)
            encoded_token = base64.b64encode(f":{settings.azure_token}".encode()).decode()
            
            self.headers = {
                "Authorization": f"Basic {encoded_token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            logger.info(f"Token formatı: Basic")
            logger.info(f"Encoded token (ilk 10 karakter): {encoded_token[:10]}")
            
            self.api_accessible = self._check_api_access()
        
        # Eğer o da başarısız olursa NTLM kimlik doğrulama için bir istek deneyelim
        if not self.api_accessible:
            logger.info("Basic auth başarısız, NTLM auth deneniyor...")
            
            # Format 3: NTLM Authentication (requests ile direkt desteklenmiyor)
            # Bu durumda, önce bir domain kullanıcı adı olup olmadığını kontrol edelim
            if '@' in settings.azure_token or '\\' in settings.azure_token:
                parts = settings.azure_token.split('@' if '@' in settings.azure_token else '\\')
                username = parts[0]
                domain = parts[1] if len(parts) > 1 else ''
                
                logger.info(f"NTLM kimlik doğrulama denenecek. Domain: {domain}, Username: {username}")
                
                # requests_ntlm gibi bir kütüphane kullanmak yerine, basic auth ile deneyin,
                # ancak domain\username formatı kullanın
                if '\\' in settings.azure_token:
                    # Token domain\username:password formatı olabilir
                    logger.info("Domain\\username formatı tespit edildi.")
                    # Direkt olarak tokeni kullan
                    self.api_accessible = self._check_api_access_with_ntlm(
                        settings.azure_token.split('\\')[0],  # domain
                        settings.azure_token.split('\\')[1]   # username:password
                    )
                else:
                    # Token username@domain formatı olabilir
                    logger.info("username@domain formatı tespit edildi.")
                    # Direkt olarak tokeni kullan
                    self.api_accessible = self._check_api_access_with_ntlm(
                        settings.azure_token.split('@')[1],  # domain
                        settings.azure_token.split('@')[0]   # username
                    )
            else:
                # Token domain\username formatı değilse, basit bir kullanıcı adı olarak deneyin
                logger.info("Basit kullanıcı adı formatı denenecek.")
                # Basit kullanıcı adı ve token şeklinde dene
                self.api_accessible = self._check_api_access_with_ntlm(None, settings.azure_token)
        
        if not self.api_accessible:
            logger.error("Azure DevOps API erişilemiyor - .env dosyasındaki konfigürasyonları kontrol edin.")
            logger.error(f"Bağlantı detayları: URL={self.base_url}, Collection={settings.azure_collection}, Project={settings.azure_project}")
            logger.error("Lütfen token'ı doğrulayın ve token yetkilerinin (scopes) doğru olduğundan emin olun.")
    
    def _check_api_access(self) -> bool:
        """
        Azure DevOps API'sine erişim kontrolü
        """
        try:
            # Tam detaylı bilgi logla
            logger.info(f"Checking API access with Authorization: {self.headers.get('Authorization', '').split(' ')[0]}")
            
            # Önce basit HTTP erişimi
            logger.info(f"Temel HTTP erişim kontrolü: {self.base_url}")
            
            # Token tipini logla
            if self.headers.get('Authorization', '').startswith('Basic'):
                logger.info("Basic auth kontrolü yapılıyor...")
            elif self.headers.get('Authorization', '').startswith('Bearer'):
                logger.info("Bearer token kontrolü yapılıyor...")
            
            # En basit endpoint ile API erişimini kontrol et
            endpoint = f"{self.base_url}/{settings.azure_collection}/_apis/projects?api-version={settings.azure_api_version}"
            logger.info(f"Trying API endpoint: {endpoint}")
            
            try:
                response = requests.get(
                    endpoint, 
                    headers=self.headers, 
                    timeout=15,
                    verify=False  # SSL sertifika doğrulamasını atla
                )
                
                logger.info(f"Response status: {response.status_code}")
                logger.info(f"Response headers: {dict(response.headers)}")
                
                # Başarılı yanıt
                if response.status_code == 200:
                    logger.info(f"Successful API access with endpoint: {endpoint}")
                    logger.info(f"Response: {response.text[:200]}...")
                    return True
                
                # 300 serisi yönlendirme
                elif response.status_code >= 300 and response.status_code < 400:
                    logger.info(f"Redirect response from: {endpoint}")
                    logger.info(f"Location: {response.headers.get('Location', 'No location header')}")
                    
                # Kimlik doğrulama hatası
                elif response.status_code == 401 or response.status_code == 403:
                    logger.error(f"Authentication error {response.status_code} from: {endpoint}")
                    logger.error(f"Response: {response.text[:500]}...")
                    # WWW-Authenticate header'ını kontrol et - bu, desteklenen kimlik doğrulama yöntemlerini içerir
                    www_auth_header = response.headers.get('WWW-Authenticate', 'Yok')
                    logger.error(f"WWW-Authenticate header: {www_auth_header}")
                    # Desteklenen tüm kimlik doğrulama yöntemlerini logla
                    if www_auth_header != 'Yok':
                        auth_methods = www_auth_header.split(',')
                        logger.info(f"Desteklenen kimlik doğrulama yöntemleri: {auth_methods}")
                        for method in auth_methods:
                            logger.info(f"Kimlik doğrulama detayı: {method.strip()}")
                    
                # Diğer hatalar
                else:
                    logger.error(f"API error {response.status_code} from: {endpoint}")
                    logger.error(f"Response: {response.text[:500]}...")
            
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error for {endpoint}: {str(e)}")
            
            logger.error("API endpoint failed. Azure DevOps API bağlantısı kurulamadı.")
            return False
            
        except Exception as e:
            logger.error(f"API erişim kontrolü sırasında beklenmeyen hata: {str(e)}")
            return False
    
    def _get_pipeline_runs(self) -> List[dict]:
        """
        Pipeline çalıştırmalarını getir
        """
        if not self.api_accessible:
            logger.warning("API erişilemediği için pipeline runs alınamıyor")
            return []
        
        try:    
            # URL formatı: doğrudan acibadem sunucusu endpoint'i
            url = f"{self.base_url}/{settings.azure_collection}/{settings.azure_project}/_apis/pipelines/runs?api-version={settings.azure_api_version}"
            logger.info(f"Fetching pipeline runs from: {url}")
            
            # NTLM kimlik doğrulama kullanılıyorsa auth nesnesini kullan
            if hasattr(self, 'auth'):
                logger.info("NTLM kimlik doğrulama kullanılıyor.")
                response = requests.get(
                    url, 
                    auth=self.auth,
                    headers=self.headers, 
                    timeout=30,
                    verify=False  # SSL sertifika doğrulamasını atla
                )
            else:
                # Normal header tabanlı doğrulama kullan
                logger.info("Normal header tabanlı doğrulama kullanılıyor.")
                response = requests.get(
                    url, 
                    headers=self.headers, 
                    timeout=30,
                    verify=False  # SSL sertifika doğrulamasını atla
                )
            
            # Log tam yanıtı
            logger.info(f"Pipeline runs response status: {response.status_code}")
            
            if response.status_code == 200:
                logger.info("Pipeline runs verileri başarıyla alındı!")
                logger.debug(f"Pipeline runs response content: {response.text[:500]}...")
            else:
                logger.error(f"Pipeline runs API error - Status Code: {response.status_code}")
                logger.error(f"Error response: {response.text[:500]}...")
                return []
                
            data = response.json()
            if "value" in data:
                logger.info(f"Başarıyla {len(data['value'])} pipeline runs alındı")
                return data["value"]
            else:
                logger.warning(f"Unexpected API response format, 'value' key not found: {data.keys()}")
                logger.warning(f"API response: {json.dumps(data)[:500]}...")
                return []
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching pipeline runs: {str(e)}")
            return []
        except ValueError as e:
            logger.error(f"Error parsing JSON response: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in _get_pipeline_runs: {str(e)}")
            return []
    
    def _get_release_deployments(self) -> List[dict]:
        """
        Release deployment'larını getir
        """
        if not self.api_accessible:
            logger.warning("API erişilemediği için release deployments alınamıyor")
            return []
        
        try:    
            # URL formatı: doğrudan acibadem sunucusu endpoint'i
            url = f"{self.base_url}/{settings.azure_collection}/{settings.azure_project}/_apis/release/deployments?api-version={settings.azure_api_version}"
            logger.info(f"Fetching release deployments from: {url}")
            
            # NTLM kimlik doğrulama kullanılıyorsa auth nesnesini kullan
            if hasattr(self, 'auth'):
                logger.info("NTLM kimlik doğrulama kullanılıyor.")
                response = requests.get(
                    url, 
                    auth=self.auth,
                    headers=self.headers, 
                    timeout=30,
                    verify=False  # SSL sertifika doğrulamasını atla
                )
            else:
                # Normal header tabanlı doğrulama kullan
                logger.info("Normal header tabanlı doğrulama kullanılıyor.")
                response = requests.get(
                    url, 
                    headers=self.headers, 
                    timeout=30,
                    verify=False  # SSL sertifika doğrulamasını atla
                )
            
            # Log tam yanıtı
            logger.info(f"Release deployments response status: {response.status_code}")
            
            if response.status_code == 200:
                logger.info("Release deployment verileri başarıyla alındı!")
                logger.debug(f"Release deployments response content: {response.text[:500]}...")
            else:
                logger.error(f"Release deployments API error - Status Code: {response.status_code}")
                logger.error(f"Error response: {response.text[:500]}...")
                return []
                
            data = response.json()
            if "value" in data:
                logger.info(f"Başarıyla {len(data['value'])} release deployments alındı")
                return data["value"]
            else:
                logger.warning(f"Unexpected API response format, 'value' key not found: {data.keys()}")
                logger.warning(f"API response: {json.dumps(data)[:500]}...")
                return []
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching release deployments: {str(e)}")
            return []
        except ValueError as e:
            logger.error(f"Error parsing JSON response: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in _get_release_deployments: {str(e)}")
            return []
    
    def _get_mock_data(self, environment=None) -> List[Deployment]:
        """
        Test için sahte veri oluştur
        """
        logger.warning("Mock data kullanılıyor - gerçek API verileri alınamadı")
        
        project_names = ["AcibademSağlık", "HastaneBilgiSistemi", "LabaratuvarYönetim"]
        pipeline_names = ["Frontend", "Backend", "Database", "MobileApp", "APIServices"]
        environments = [Environment.DEV, Environment.TEST, Environment.PROD]
        statuses = [DeploymentStatus.SUCCESS, DeploymentStatus.FAILURE, DeploymentStatus.IN_PROGRESS]
        
        # Son 18 aylık sahte veri oluştur (2024 başından itibaren)
        now = datetime.now(timezone.utc)
        start_date = datetime(2024, 1, 1, tzinfo=timezone.utc)  # 2024-01-01 00:00:00 UTC
        deployments = []
        
        # Her proje, pipeline ve ortam için en az bir kayıt oluştur
        for project in project_names:
            for pipeline in pipeline_names:
                for env in environments:
                    # 2024-01-01 ile şu an arasında rastgele tarih
                    days_range = (now - start_date).days
                    if days_range <= 0:
                        days_range = 1
                    days_ago = random.randint(0, days_range)
                    deploy_date = now - timedelta(days=days_ago)
                    
                    # 2024 yılı için bir kayıt ekleyelim
                    deployment_2024 = Deployment(
                        project_name=project,
                        pipeline_name=pipeline,
                        environment=env,
                        timestamp=datetime(2024, random.randint(1, 12), random.randint(1, 28), 
                                          random.randint(0, 23), random.randint(0, 59), random.randint(0, 59),
                                          tzinfo=timezone.utc),
                        status=random.choice(statuses)
                    )
                    deployments.append(deployment_2024)
                    
                    # Güncel tarih için bir kayıt ekleyelim
                    deployment_current = Deployment(
                        project_name=project,
                        pipeline_name=pipeline,
                        environment=env,
                        timestamp=deploy_date,
                        status=random.choice(statuses)
                    )
                    deployments.append(deployment_current)
        
        logger.info(f"Oluşturulan tüm mock veri sayısı: {len(deployments)}")
        
        # Environment ile hemen filtreleme
        if environment:
            logger.info(f"Environment filtresi tipi: {type(environment)}, değeri: {environment}")
            deployments = [d for d in deployments if d.environment == environment]
            
        logger.info(f"Environment filtrelemesi sonrası: {len(deployments)}")
        return deployments
    
    def get_deployments(self, 
                       project: str = None,
                       environment: Environment = None,
                       start_date: datetime = None,
                       end_date: datetime = None) -> List[Deployment]:
        """
        Tüm deployment'ları getir ve filtrele
        """
        logger.info(f"Filtreleme: project={project}, environment={environment}, start_date={start_date}, end_date={end_date}")
        
        # API'den veri alma denemesi
        deployments = []
        api_success = False
        
        # API'den veri almayı dene
        logger.info("Azure API'den gerçek veriler alınmaya çalışılıyor...")
        
        # Pipeline çalıştırmalarını al
        pipeline_runs = self._get_pipeline_runs()
        if pipeline_runs:
            logger.info(f"Alınan pipeline runs sayısı: {len(pipeline_runs)}")
            api_success = True
            
            for run in pipeline_runs:
                try:
                    # Gerekli alanlar için null kontrolü yap
                    if not run.get("createdDate"):
                        logger.warning(f"Pipeline run'da createdDate alanı eksik: {run}")
                        continue
                        
                    deploy_status = DeploymentStatus.SUCCESS
                    if run.get("result") == "succeeded":
                        deploy_status = DeploymentStatus.SUCCESS
                    elif run.get("result") == "failed":
                        deploy_status = DeploymentStatus.FAILURE
                    elif run.get("result") == "canceled":
                        deploy_status = DeploymentStatus.CANCELED
                    elif run.get("state") == "inProgress":
                        deploy_status = DeploymentStatus.IN_PROGRESS
                    else:
                        deploy_status = DeploymentStatus.UNKNOWN
                        
                    deployment = Deployment(
                        project_name=run.get("project", {}).get("name", settings.azure_project),
                        pipeline_name=run.get("pipeline", {}).get("name", "Unknown"),
                        environment=Environment.DEV,  # Default olarak DEV
                        timestamp=datetime.fromisoformat(run.get("createdDate").replace('Z', '+00:00')),
                        status=deploy_status
                    )
                    deployments.append(deployment)
                except Exception as e:
                    logger.error(f"Pipeline run işleme hatası: {str(e)}")
                    logger.error(f"Hatalı pipeline run verisi: {run}")
        
        # Release deployment'larını al
        release_deployments = self._get_release_deployments()
        if release_deployments:
            logger.info(f"Alınan release deployments sayısı: {len(release_deployments)}")
            api_success = True
            
            for deployment in release_deployments:
                try:
                    # Gerekli alanlar için null kontrolü yap
                    if not deployment.get("completedOn"):
                        logger.warning(f"Release deployment'ında completedOn alanı eksik: {deployment}")
                        continue
                        
                    env_name = deployment.get("releaseEnvironment", {}).get("name", "").upper()
                    if "PROD" in env_name:
                        env = Environment.PROD
                    elif "TEST" in env_name:
                        env = Environment.TEST
                    else:
                        env = Environment.DEV
                        
                    deploy_status = DeploymentStatus.SUCCESS
                    if deployment.get("deploymentStatus") == "succeeded":
                        deploy_status = DeploymentStatus.SUCCESS
                    elif deployment.get("deploymentStatus") == "failed":
                        deploy_status = DeploymentStatus.FAILURE
                    elif deployment.get("deploymentStatus") == "inProgress":
                        deploy_status = DeploymentStatus.IN_PROGRESS
                    else:
                        deploy_status = DeploymentStatus.UNKNOWN
                        
                    deployment_obj = Deployment(
                        project_name=deployment.get("project", {}).get("name", settings.azure_project),
                        pipeline_name=deployment.get("release", {}).get("name", "Unknown"),
                        environment=env,
                        timestamp=datetime.fromisoformat(deployment.get("completedOn").replace('Z', '+00:00')),
                        status=deploy_status
                    )
                    deployments.append(deployment_obj)
                except Exception as e:
                    logger.error(f"Release deployment işleme hatası: {str(e)}")
                    logger.error(f"Hatalı release deployment verisi: {deployment}")
        
        # API veri getirdiyse başarı mesajı görüntüle
        if api_success and deployments:
            logger.info(f"Gerçek API verileri başarıyla alındı. Deployment sayısı: {len(deployments)}")
        elif not deployments:
            logger.warning("API'den hiç veri alınamadı. Boş liste dönülüyor.")
        
        # Filtreleme
        filtered_deployments = deployments
        
        # Proje filtresi - büyük/küçük harf duyarsız
        if project:
            project_lower = project.lower()
            before_count = len(filtered_deployments)
            filtered_deployments = [d for d in filtered_deployments if d.project_name.lower() == project_lower]
            logger.info(f"Proje filtresi sonrası: {before_count} -> {len(filtered_deployments)}")
            
        # Tarihler için saat dilimi bilgisini kontrol et ve uyumlu hale getir
        if start_date:
            # start_date'e saat dilimi bilgisi ekle (eğer yoksa)
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            before_count = len(filtered_deployments)
            filtered_deployments = [d for d in filtered_deployments if d.timestamp >= start_date]
            logger.info(f"Başlangıç tarihi filtresi sonrası: {before_count} -> {len(filtered_deployments)}")
            
        if end_date:
            # end_date'e saat dilimi bilgisi ekle (eğer yoksa)
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
            before_count = len(filtered_deployments)
            filtered_deployments = [d for d in filtered_deployments if d.timestamp <= end_date]
            logger.info(f"Bitiş tarihi filtresi sonrası: {before_count} -> {len(filtered_deployments)}")
        
        logger.info(f"Filtreleme sonrası: {len(filtered_deployments)} kayıt bulundu")
        return filtered_deployments

    def _check_api_access_with_ntlm(self, domain, username_or_token):
        """
        NTLM tabanlı kimlik doğrulama ile API erişimi kontrolü
        """
        try:
            logger.info(f"NTLM Kimlik doğrulama deneniyor. Domain: {domain}, Username: {username_or_token}")
            
            from requests.auth import HTTPBasicAuth
            
            # En basit endpoint'i dene 
            endpoint = f"{self.base_url}/{settings.azure_collection}/_apis/projects?api-version={settings.azure_api_version}"
            
            logger.info(f"Trying API endpoint with NTLM: {endpoint}")
            
            # HTTPBasicAuth ile dene 
            auth = HTTPBasicAuth(username_or_token, '')
            
            response = requests.get(
                endpoint, 
                auth=auth,
                headers={"Accept": "application/json"},
                timeout=15,
                verify=False  # SSL sertifika doğrulamasını atla
            )
            
            logger.info(f"NTLM response status: {response.status_code}")
            
            if response.status_code == 200:
                logger.info("NTLM kimlik doğrulama başarılı!")
                logger.info(f"Response: {response.text[:200]}...")
                
                # Başarılı olunca headerları güncelle
                self.headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                
                # auth bilgisini sakla
                self.auth = auth
                
                return True
            else:
                logger.error(f"NTLM kimlik doğrulama hatası - Status Code: {response.status_code}")
                logger.error(f"Response: {response.text[:500]}...")
                return False
                
        except Exception as e:
            logger.error(f"NTLM kimlik doğrulama sırasında hata: {str(e)}")
            return False

# Servis instance'ı
azure_devops_service = AzureDevOpsService() 