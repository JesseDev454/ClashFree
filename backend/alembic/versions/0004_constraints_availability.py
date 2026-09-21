"""Create scheduling constraint and availability tables.

Revision ID: 0004_constraints_availability
Revises: 0003_academic_crud
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_constraints_availability"
down_revision: str | None = "0003_academic_crud"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "scheduling_constraints",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("locked", sa.Boolean(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "constraint_weight_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("schedule_stability", sa.Integer(), nullable=False),
        sa.Column("student_idle_gaps", sa.Integer(), nullable=False),
        sa.Column("room_utilization", sa.Integer(), nullable=False),
        sa.Column("lecturer_preferences", sa.Integer(), nullable=False),
        sa.Column("daily_balance", sa.Integer(), nullable=False),
        sa.Column("building_movement", sa.Integer(), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(
        "ix_constraint_weight_profiles_is_current",
        "constraint_weight_profiles",
        ["is_current"],
    )
    op.create_table(
        "lecturer_availability_slots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("lecturer_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.String(length=8), nullable=False),
        sa.Column("period", sa.String(length=8), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(["lecturer_id"], ["lecturers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "lecturer_id",
            "weekday",
            "period",
            name="uq_lecturer_availability_slot",
        ),
    )
    op.create_index(
        "ix_lecturer_availability_slots_lecturer_id",
        "lecturer_availability_slots",
        ["lecturer_id"],
    )
    op.create_table(
        "lecturer_availability_exceptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("lecturer_id", sa.Integer(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("start_period", sa.String(length=8), nullable=True),
        sa.Column("end_period", sa.String(length=8), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(["lecturer_id"], ["lecturers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_lecturer_availability_exceptions_lecturer_id",
        "lecturer_availability_exceptions",
        ["lecturer_id"],
    )
    op.create_table(
        "lecturer_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("lecturer_id", sa.Integer(), nullable=False),
        sa.Column("prefer_morning", sa.Boolean(), nullable=False),
        sa.Column("avoid_friday_afternoon", sa.Boolean(), nullable=False),
        sa.Column("no_early_after_late", sa.Boolean(), nullable=False),
        sa.Column("max_classes_per_day", sa.Integer(), nullable=False),
        sa.Column("max_consecutive_hours", sa.Integer(), nullable=False),
        sa.Column("min_break_minutes", sa.Integer(), nullable=False),
        sa.Column("preferred_days", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["lecturer_id"], ["lecturers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lecturer_id"),
    )
    op.create_table(
        "room_availability_slots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.String(length=8), nullable=False),
        sa.Column("period", sa.String(length=8), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id", "weekday", "period", name="uq_room_availability_slot"),
    )
    op.create_index(
        "ix_room_availability_slots_room_id",
        "room_availability_slots",
        ["room_id"],
    )
    op.create_table(
        "room_availability_blocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("start_period", sa.String(length=8), nullable=True),
        sa.Column("end_period", sa.String(length=8), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("recurring", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_room_availability_blocks_room_id",
        "room_availability_blocks",
        ["room_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_room_availability_blocks_room_id", table_name="room_availability_blocks")
    op.drop_table("room_availability_blocks")
    op.drop_index("ix_room_availability_slots_room_id", table_name="room_availability_slots")
    op.drop_table("room_availability_slots")
    op.drop_table("lecturer_preferences")
    op.drop_index(
        "ix_lecturer_availability_exceptions_lecturer_id",
        table_name="lecturer_availability_exceptions",
    )
    op.drop_table("lecturer_availability_exceptions")
    op.drop_index(
        "ix_lecturer_availability_slots_lecturer_id",
        table_name="lecturer_availability_slots",
    )
    op.drop_table("lecturer_availability_slots")
    op.drop_index(
        "ix_constraint_weight_profiles_is_current",
        table_name="constraint_weight_profiles",
    )
    op.drop_table("constraint_weight_profiles")
    op.drop_table("scheduling_constraints")
