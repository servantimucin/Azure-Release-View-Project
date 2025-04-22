from fastapi import APIRouter, Query
from datetime import datetime
from typing import List, Optional
from app.models.deployment import Deployment, Environment
from app.services.azure_devops import azure_devops_service

router = APIRouter()

@router.get("/deployments", response_model=List[Deployment])
async def get_deployments(
    project: Optional[str] = Query(None, description="Proje adı ile filtreleme"),
    environment: Optional[Environment] = Query(None, description="Ortam ile filtreleme (Development, Test, Production)"),
    start_date: Optional[datetime] = Query(None, description="Başlangıç tarihi ile filtreleme (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="Bitiş tarihi ile filtreleme (ISO format)")
) -> List[Deployment]:
    """
    Deployment listesini getir ve filtrele
    """
    return azure_devops_service.get_deployments(
        project=project,
        environment=environment,
        start_date=start_date,
        end_date=end_date
    ) 