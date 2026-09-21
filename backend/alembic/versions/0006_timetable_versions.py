"""Create timetable version and published slot snapshot tables.

Revision ID: 0006_timetable_versions
Revises: 0005_timetable_runs
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_timetable_versions"
down_revision: str | None = "0005_timetable_runs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "timetable_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("solution_id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_by", sa.Integer(), nullable=False),
        sa.Column("slot_count", sa.Integer(), nullable=False),
        sa.Column("hard_violations", sa.Integer(), nullable=False),
        sa.Column("soft_penalty", sa.Integer(), nullable=False),
        sa.Column("room_utilization_percent", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["timetable_runs.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["academic_sessions.id"]),
        sa.ForeignKeyConstraint(["solution_id"], ["timetable_solutions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "session_id",
            "version_number",
            name="uq_timetable_version_session_number",
        ),
    )
    op.create_index("ix_timetable_versions_session_id", "timetable_versions", ["session_id"])
    op.create_index("ix_timetable_versions_status", "timetable_versions", ["status"])
    op.create_index("ix_timetable_versions_is_current", "timetable_versions", ["is_current"])
    op.create_table(
        "timetable_version_slots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version_id", sa.Integer(), nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("meeting_index", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.String(length=8), nullable=False),
        sa.Column("start_period", sa.String(length=8), nullable=False),
        sa.Column("end_period", sa.String(length=8), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["course_assignments.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"]),
        sa.ForeignKeyConstraint(
            ["version_id"],
            ["timetable_versions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "version_id",
            "weekday",
            "start_period",
            "room_id",
            name="uq_timetable_version_slot_room_period",
        ),
    )
    op.create_index(
        "ix_timetable_version_slots_version_id",
        "timetable_version_slots",
        ["version_id"],
    )
    op.create_index(
        "ix_timetable_version_slots_assignment_id",
        "timetable_version_slots",
        ["assignment_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_timetable_version_slots_assignment_id",
        table_name="timetable_version_slots",
    )
    op.drop_index(
        "ix_timetable_version_slots_version_id",
        table_name="timetable_version_slots",
    )
    op.drop_table("timetable_version_slots")
    op.drop_index("ix_timetable_versions_is_current", table_name="timetable_versions")
    op.drop_index("ix_timetable_versions_status", table_name="timetable_versions")
    op.drop_index("ix_timetable_versions_session_id", table_name="timetable_versions")
    op.drop_table("timetable_versions")
