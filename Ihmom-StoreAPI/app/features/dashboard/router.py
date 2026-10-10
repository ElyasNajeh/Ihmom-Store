from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.dashboard import service
from app.features.dashboard.schema import DashboardPeriod, DashboardStatsResponse

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    period: DashboardPeriod = Query("day"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_dashboard_stats(db, period)
