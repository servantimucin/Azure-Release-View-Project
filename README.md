# Azure DevOps Deployment Dashboard

Bu proje, Azure DevOps üzerindeki deployment geçmişini izlemek, filtrelemek ve görselleştirmek için geliştirilmiş modern bir dashboard uygulamasıdır. FastAPI backend ve Bootstrap, Chart.js gibi modern frontend teknolojileri kullanılarak oluşturulmuştur.

## Özellikler

- Azure DevOps pipeline ve release geçmişini otomatik olarak çeker
- Deployment verilerini filtrelenebilir API endpoint'i ile sunar
- Modern ve kullanıcı dostu dashboard arayüzü
- İnteraktif grafikler ve görselleştirmeler (Chart.js)
- Geliştirme takip sayfası ve zaman çizelgesi
- Responsive tasarım (mobil ve masaüstü uyumlu)
- Swagger UI ile API dokümantasyonu ve test imkanı
- CORS desteği ile frontend entegrasyonu
- Çevresel değişkenler ile kolay konfigürasyon

## Kurulum

1. Projeyi klonlayın:
```bash
git clone <repo-url>
cd <proje-klasörü>
```

2. Python sanal ortam oluşturun ve aktifleştirin:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# veya
.\venv\Scripts\activate  # Windows
```

3. Bağımlılıkları yükleyin:
```bash
pip install -r requirements.txt
```

4. `.env` dosyasını düzenleyin:
```env
AZURE_TOKEN=your_personal_access_token
AZURE_ORG=your_organization_name
AZURE_PROJECT=your_project_name
API_HOST=0.0.0.0
API_PORT=8000
```

## Çalıştırma

```bash
python -m app.main
```

Uygulama varsayılan olarak http://localhost:8000 adresinde çalışacaktır.

## API Endpoint'leri

### GET /api/v1/deployments

Deployment geçmişini listeler ve filtreler.

Query Parametreleri:
- `project`: Proje adı ile filtreleme
- `environment`: Ortam ile filtreleme (Development, Test, Production)
- `start_date`: Başlangıç tarihi ile filtreleme (ISO format)
- `end_date`: Bitiş tarihi ile filtreleme (ISO format)

Örnek İstek:
```bash
curl "http://localhost:8000/api/v1/deployments?environment=Production&start_date=2024-01-01T00:00:00Z"
```

## Dokümantasyon

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Dashboard: http://localhost:8000/new-dashboard
- Deployment Geliştirmeleri: http://localhost:8000/changes

## Yapılan Geliştirmeler ve Değişiklikler

Bu projede aşağıdaki geliştirmeler ve değişiklikler yapılmıştır:

### 1. Modern Dashboard Arayüzü

- Azure DevOps benzeri modern ve kullanıcı dostu bir dashboard eklenmiştir.
- Dashboard şu bileşenleri içermektedir:
  - Üst kısımda navigasyon çubuğu ve arama alanı
  - Deployment filtreleme bölümü (Proje, Ortam, Başlangıç ve Bitiş Tarihleri)
  - İstatistik kartları (Toplam, Başarılı ve Başarısız deployment sayıları)
  - Grafiksel görselleştirmeler (Ortam dağılımı, deployment durum trendi)
  - Recent Deployments listesi

### 2. İnteraktif Grafikler

- Chart.js kütüphanesi kullanılarak interaktif grafikler eklenmiştir:
  - **Deployments by Environment**: Ortamlara göre dağılımı gösteren halka (donut) grafik
  - **Deployment Status Trend**: Zaman içindeki başarılı/başarısız deployment dağılımını gösteren çizgi grafik
- Grafikler üzerine gelince detay bilgileri görüntülenebilmektedir.

### 3. Geliştirme Takip Sayfası

- Yapılan geliştirmeleri takip etmek için yeni bir `/changes` sayfası eklenmiştir.
- Bu sayfa şunları içermektedir:
  - Zaman çizelgesi formatında yapılan değişikliklerin listesi
  - Değişiklik detayları (tarih, açıklama, etiketler)
  - Yakında gelecek özellikler listesi

### 4. Dokümantasyon Desteği

- Yan menüye "Documentation" bağlantısı eklenmiştir.
- Dokümantasyon için yeni bir endpoint (/documentation) eklenmiştir.

### 5. Otomatik Yönlendirme Sayfaları

- Ana sayfadan dashboard'a otomatik yönlendirme
- Kullanıcı dostu hata ve yükleme sayfaları

### 6. Kullanıcı Arayüzü İyileştirmeleri

- Modern, responsive tasarım
- Bootstrap ve Font Awesome entegrasyonu
- Duruma göre renklendirilmiş kartlar ve rozetler
- Etkileşimli liste elemanları (hover efektleri)

## Kurulum ve Kullanım

1. Gerekli bağımlılıkları yükleyin:
```bash
pip install fastapi uvicorn jinja2 python-dotenv
```

2. Uygulamayı başlatın:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. Tarayıcınızda aşağıdaki URL'leri ziyaret edin:
   - Dashboard: http://localhost:8000/new-dashboard
   - Geliştirmeler Sayfası: http://localhost:8000/changes
   - API Dokümantasyonu: http://localhost:8000/docs

## Ekran Görüntüleri

### Dashboard Ekranı
Uygulamanın ana dashboard ekranı, Azure DevOps tarzında modern bir arayüz sunmaktadır. Filtreler, istatistikler, grafikler ve deployment listesi içerir.

### Geliştirme Takip Sayfası
Yapılan değişiklikleri zaman çizelgesi formatında görüntülemek için kullanılır. Her değişiklik için detaylı bilgiler ve tarihler içerir.

## Notlar ve Teşekkürler

Bu proje, Azure DevOps Deployment sistemi için modern ve kullanıcı dostu bir arayüz sağlamayı amaçlamaktadır. Grafikler ve görselleştirmeler için Chart.js, arayüz için Bootstrap ve Font Awesome kullanılmıştır.

Projeyi geliştirme fırsatı ve yönlendirmeler için teşekkür ederiz.

## Geliştirme

1. Kod stilini koruyun
2. Yeni özellikler için test yazın
3. Dokümantasyonu güncelleyin

## Lisans

MIT 