"""Create academic CRUD tables and attach departments to faculties.

Revision ID: 0003_academic_crud
Revises: 0002_auth_rbac
Create Date: 2026-09-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_academic_crud"
down_revision: str | None = "0002_auth_rbac"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "faculties",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.add_column("departments", sa.Column("faculty_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_departments_faculty_id",
        "departments",
        "faculties",
        ["faculty_id"],
        ["id"],
    )
    op.create_table(
        "academic_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=32), nullable=False),
        sa.Column("semester", sa.String(length=16), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("draft_opens_on", sa.Date(), nullable=True),
        sa.Column("publish_deadline_on", sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_academic_sessions_status", "academic_sessions", ["status"])
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("units", sa.Integer(), nullable=False),
        sa.Column("expected_size", sa.Integer(), nullable=False),
        sa.Column("room_type", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_courses_department_id", "courses", ["department_id"])
    op.create_table(
        "cohorts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_cohorts_department_id", "cohorts", ["department_id"])
    op.create_table(
        "lecturers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("max_weekly_hours", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_lecturers_department_id", "lecturers", ["department_id"])
    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("building", sa.String(length=128), nullable=False),
        sa.Column("room_type", sa.String(length=32), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("equipment", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "course_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("cohort_id", sa.Integer(), nullable=False),
        sa.Column("lecturer_id", sa.Integer(), nullable=True),
        sa.Column("contact_pattern", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.ForeignKeyConstraint(["cohort_id"], ["cohorts.id"]),
        sa.ForeignKeyConstraint(["lecturer_id"], ["lecturers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "cohort_id", name="uq_assignment_course_cohort"),
    )
    op.create_index("ix_course_assignments_course_id", "course_assignments", ["course_id"])
    op.create_index("ix_course_assignments_cohort_id", "course_assignments", ["cohort_id"])


def downgrade() -> None:
    op.drop_index("ix_course_assignments_cohort_id", table_name="course_assignments")
    op.drop_index("ix_course_assignments_course_id", table_name="course_assignments")
    op.drop_table("course_assignments")
    op.drop_table("rooms")
    op.drop_index("ix_lecturers_department_id", table_name="lecturers")
    op.drop_table("lecturers")
    op.drop_index("ix_cohorts_department_id", table_name="cohorts")
    op.drop_table("cohorts")
    op.drop_index("ix_courses_department_id", table_name="courses")
    op.drop_table("courses")
    op.drop_index("ix_academic_sessions_status", table_name="academic_sessions")
    op.drop_table("academic_sessions")
    op.drop_constraint("fk_departments_faculty_id", "departments", type_="foreignkey")
    op.drop_column("departments", "faculty_id")
    op.drop_table("faculties")
