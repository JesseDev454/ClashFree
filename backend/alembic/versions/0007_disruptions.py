"""Create disruptions table for post-publication incidents.

Revision ID: 0007_disruptions
Revises: 0006_timetable_versions
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_disruptions"
down_revision: str | None = "0006_timetable_versions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "disruptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=True),
        sa.Column("lecturer_id", sa.Integer(), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("start_period", sa.String(length=8), nullable=True),
        sa.Column("end_period", sa.String(length=8), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("reported_by", sa.Integer(), nullable=False),
        sa.Column("block_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["block_id"], ["room_availability_blocks.id"]),
        sa.ForeignKeyConstraint(["lecturer_id"], ["lecturers.id"]),
        sa.ForeignKeyConstraint(["reported_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["academic_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_disruptions_session_id", "disruptions", ["session_id"])
    op.create_index("ix_disruptions_kind", "disruptions", ["kind"])
    op.create_index("ix_disruptions_status", "disruptions", ["status"])
    op.create_index("ix_disruptions_reported_by", "disruptions", ["reported_by"])
    op.create_index("ix_disruptions_room_id", "disruptions", ["room_id"])
    op.create_index("ix_disruptions_lecturer_id", "disruptions", ["lecturer_id"])


def downgrade() -> None:
    op.drop_index("ix_disruptions_lecturer_id", table_name="disruptions")
    op.drop_index("ix_disruptions_room_id", table_name="disruptions")
    op.drop_index("ix_disruptions_reported_by", table_name="disruptions")
    op.drop_index("ix_disruptions_status", table_name="disruptions")
    op.drop_index("ix_disruptions_kind", table_name="disruptions")
    op.drop_index("ix_disruptions_session_id", table_name="disruptions")
    op.drop_table("disruptions")
