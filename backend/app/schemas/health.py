from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class HealthProbePayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_seen_at: datetime
    source: str
    detail: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    service: str
    database: Literal["connected", "unavailable"]
    probe: HealthProbePayload | None = None
    detail: str | None = None
