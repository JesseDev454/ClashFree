"""Portal accounts, department constraints, and schedule requests.

Revision ID: 0009_portals
Revises: 0008_repair_runs
Create Date: 2026-09-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009_portals"
down_revision: str | None = "0008_repair_runs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column("users", sa.Column("cohort_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_cohort_id", "users", "cohorts", ["cohort_id"], ["id"])
    op.create_table(
        "department_constraints",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("weekday", sa.String(length=8), nullable=True),
        sa.Column("period", sa.String(length=8), nullable=True),
        sa.Column("room_type", sa.String(length=32), nullable=True),
        sa.Column("note", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_department_constraints_department_id",
        "department_constraints",
        ["department_id"],
    )
    op.create_table(
        "schedule_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "session_id", sa.Integer(), sa.ForeignKey("academic_sessions.id"), nullable=False
        ),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column(
            "assignment_id", sa.Integer(), sa.ForeignKey("course_assignments.id"), nullable=True
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decided_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_schedule_requests_department_id", "schedule_requests", ["department_id"])
    op.create_index("ix_schedule_requests_requester_id", "schedule_requests", ["requester_id"])
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_settings")
    op.drop_index("ix_schedule_requests_requester_id", table_name="schedule_requests")
    op.drop_index("ix_schedule_requests_department_id", table_name="schedule_requests")
    op.drop_table("schedule_requests")
    op.drop_index("ix_department_constraints_department_id", table_name="department_constraints")
    op.drop_table("department_constraints")
    op.drop_constraint("fk_users_cohort_id", "users", type_="foreignkey")
    op.drop_column("users", "cohort_id")
    op.drop_column("users", "is_active")
