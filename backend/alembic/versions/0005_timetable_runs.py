"""Create timetable run, solution, slot and conflict tables.

Revision ID: 0005_timetable_runs
Revises: 0004_constraints_availability
Create Date: 2026-09-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_timetable_runs"
down_revision: str | None = "0004_constraints_availability"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "timetable_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("weight_profile_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("alternative_count", sa.Integer(), nullable=False),
        sa.Column("random_seed", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("solve_time_ms", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["academic_sessions.id"]),
        sa.ForeignKeyConstraint(["weight_profile_id"], ["constraint_weight_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_timetable_runs_session_id", "timetable_runs", ["session_id"])
    op.create_index("ix_timetable_runs_status", "timetable_runs", ["status"])
    op.create_table(
        "timetable_solutions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=8), nullable=False),
        sa.Column("objective", sa.Integer(), nullable=False),
        sa.Column("hard_violations", sa.Integer(), nullable=False),
        sa.Column("soft_penalty", sa.Integer(), nullable=False),
        sa.Column("room_utilization_percent", sa.Integer(), nullable=False),
        sa.Column("student_gap_hours", sa.Float(), nullable=False),
        sa.Column("is_selected", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["timetable_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_timetable_solutions_run_id", "timetable_solutions", ["run_id"])
    op.create_index(
        "ix_timetable_solutions_is_selected",
        "timetable_solutions",
        ["is_selected"],
    )
    op.create_table(
        "timetable_slots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("solution_id", sa.Integer(), nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("meeting_index", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.String(length=8), nullable=False),
        sa.Column("start_period", sa.String(length=8), nullable=False),
        sa.Column("end_period", sa.String(length=8), nullable=False),
        sa.Column("room_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["course_assignments.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"]),
        sa.ForeignKeyConstraint(
            ["solution_id"],
            ["timetable_solutions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "solution_id",
            "weekday",
            "start_period",
            "room_id",
            name="uq_timetable_slot_room_period",
        ),
    )
    op.create_index("ix_timetable_slots_solution_id", "timetable_slots", ["solution_id"])
    op.create_index(
        "ix_timetable_slots_assignment_id",
        "timetable_slots",
        ["assignment_id"],
    )
    op.create_table(
        "timetable_conflicts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("solution_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column("weekday", sa.String(length=8), nullable=True),
        sa.Column("period", sa.String(length=8), nullable=True),
        sa.Column(
            "assignment_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["solution_id"],
            ["timetable_solutions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_timetable_conflicts_solution_id",
        "timetable_conflicts",
        ["solution_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_timetable_conflicts_solution_id", table_name="timetable_conflicts")
    op.drop_table("timetable_conflicts")
    op.drop_index("ix_timetable_slots_assignment_id", table_name="timetable_slots")
    op.drop_index("ix_timetable_slots_solution_id", table_name="timetable_slots")
    op.drop_table("timetable_slots")
    op.drop_index("ix_timetable_solutions_is_selected", table_name="timetable_solutions")
    op.drop_index("ix_timetable_solutions_run_id", table_name="timetable_solutions")
    op.drop_table("timetable_solutions")
    op.drop_index("ix_timetable_runs_status", table_name="timetable_runs")
    op.drop_index("ix_timetable_runs_session_id", table_name="timetable_runs")
    op.drop_table("timetable_runs")
