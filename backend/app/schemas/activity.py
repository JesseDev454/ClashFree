from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    title: str
    body: str
    href: str | None
    read_at: datetime | None
    created_at: datetime


class ReadAllOut(BaseModel):
    updated: int


class AuditEventOut(BaseModel):
    id: int
    actor_id: int | None
    actor_name: str | None
    action: str
    entity_type: str
    entity_id: int | None
    summary: str
    created_at: datetime


class ReportOut(BaseModel):
    meeting_count: int
    room_utilization_percent: int
    change_count: int
    open_disruptions: int
    pending_requests: int


class RoomUtilizationOut(BaseModel):
    room_id: int
    room_code: str
    building: str | None
    status: str
    occupied_slots: int
    week_slots: int
    utilization_percent: int


class FacilityHistoryOut(BaseModel):
    id: str
    source: str
    title: str
    detail: str
    room_code: str | None
    occurred_at: datetime
    status: str | None
