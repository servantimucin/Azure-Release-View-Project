from pydantic import BaseSettings, ConfigDict
from dotenv import load_dotenv
import os

# .env dosyasını yükle
load_dotenv()

class Settings(BaseSettings):
    """
    Uygulama ayarları
    """
    # Azure DevOps ayarları
    azure_token: str
    azure_collection: str
    azure_project: str
    
    # API ayarları
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Azure DevOps API endpoint'i
    azure_base_url: str
    azure_api_version: str = "7.0"
    
    # Mock veri kullanımı
    use_mock_data: bool = False
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_prefix=""
    )

# Ayarları yükle
settings = Settings(
    azure_token=os.getenv("AZURE_TOKEN", ""),
    azure_base_url=os.getenv("AZURE_BASE_URL", ""),
    azure_collection=os.getenv("AZURE_COLLECTION", ""),
    azure_project=os.getenv("AZURE_PROJECT", ""),
    api_host=os.getenv("API_HOST", "0.0.0.0"),
    api_port=int(os.getenv("API_PORT", "8000")),
    azure_api_version=os.getenv("AZURE_API_VERSION", "7.0"),
    use_mock_data=os.getenv("USE_MOCK_DATA", "false").lower() == "true"
) 