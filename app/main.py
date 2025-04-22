from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import logging
from datetime import datetime, timedelta
from app.api.deployments import router as deployments_router
from app.core.config import settings

# Loglama ayarlarını yapılandır
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

# FastAPI uygulamasını oluştur
app = FastAPI(
    title="Azure DevOps Deployment API",
    description="Azure DevOps deployment geçmişini sorgulayan API",
    version="1.0.0"
)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tüm originlere izin ver
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statik dosyalar ve şablonlar
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Router'ı ekle
app.include_router(deployments_router, prefix="/api/v1", tags=["deployments"])

# Ana sayfa
@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("redirect_to_dashboard.html", {"request": request})

# Swagger UI için endpoint yönlendirmesi
@app.get("/swagger-ui", include_in_schema=False)
async def swagger_ui_redirect(request: Request):
    return templates.TemplateResponse("redirect.html", {"request": request, "redirect_url": "/docs"})

# Yapılan değişiklikleri göstermek için endpoint
@app.get("/changes", include_in_schema=False)
async def changes(request: Request):
    return templates.TemplateResponse(
        "simple_changes.html", 
        {
            "request": request
        }
    )

# Yeni dashboard sayfası için endpoint
@app.get("/new-dashboard", include_in_schema=False)
async def new_dashboard(request: Request):
    return templates.TemplateResponse("dashboard_new.html", {"request": request})

# Cache temizleme endpoint'i
@app.get("/clear-cache", include_in_schema=False)
async def clear_cache(request: Request):
    """
    Tarayıcı cache'ini temizlemek için bir sayfa
    Bu sayfayı ziyaret ettikten sonra dashboard'a yönlendirir
    """
    response = templates.TemplateResponse("clear_cache.html", {"request": request})
    
    # Cache kontrolü devre dışı bırakılır ve sayfanın tekrar yüklenmesi sağlanır
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    ) 