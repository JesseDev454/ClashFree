"""Batch repair ids on timetable runs.

Revision ID: 0011_repair_batch
Revises: 0010_activity
Create Date: 2026-09-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0011_repair_batch"
down_revision: str | None = "0010_activity"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("timetable_runs", sa.Column("disruption_ids", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("timetable_runs", "disruption_ids")
