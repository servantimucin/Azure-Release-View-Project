from datetime import datetime
from pydantic import BaseModel
from enum import Enum
from typing import Optional

class DeploymentStatus(str, Enum):
    """
    Deployment durumları için enum
    """
    SUCCESS = "Succeeded"
    FAILURE = "Failed"
    IN_PROGRESS = "In Progress"
    CANCELED = "Canceled"
    UNKNOWN = "Unknown"

    @classmethod
    def _missing_(cls, value):
        """
        String değer enum değerine çevrilirken bu metod çağrılır
        """
        if isinstance(value, str):
            # Büyük/küçük harf duyarsız arama yap
            for member in cls:
                if member.value.lower() == value.lower():
                    return member
        return None

class Environment(str, Enum):
    """
    Deployment ortamları için enum
    """
    DEV = "Development"
    TEST = "Test"
    PROD = "Production"

    @classmethod
    def _missing_(cls, value):
        """
        String değer enum değerine çevrilirken bu metod çağrılır
        """
        if isinstance(value, str):
            # Büyük/küçük harf duyarsız arama yap
            for member in cls:
                if member.value.lower() == value.lower():
                    return member
        return None

class Deployment(BaseModel):
    """
    Deployment verisi için model
    """
    project_name: str
    pipeline_name: str
    environment: Environment
    timestamp: datetime
    status: DeploymentStatus
    id: Optional[str] = None
    duration: Optional[str] = None
    triggered_by: Optional[str] = None
    commit: Optional[str] = None
    
    class Config:
        from_attributes = True

class DeploymentFilter(BaseModel):
    """
    Deployment filtreleme parametreleri için model
    """
    project: str | None = None
    environment: Environment | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None 