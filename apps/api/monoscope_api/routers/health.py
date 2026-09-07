from fastapi import APIRouter

from apps.api.monoscope_api.schemas import HealthResponse
from monoscope import __version__

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=__version__)
