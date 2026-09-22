"""Tag timetable runs that repair a disruption.

Revision ID: 0008_repair_runs
Revises: 0007_disruptions
Create Date: 2026-09-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_repair_runs"
down_revision: str | None = "0007_disruptions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "timetable_runs",
        sa.Column(
            "purpose",
            sa.String(length=16),
            nullable=False,
            server_default="generate",
        ),
    )
    op.add_column(
        "timetable_runs",
        sa.Column("disruption_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_timetable_runs_disruption_id",
        "timetable_runs",
        "disruptions",
        ["disruption_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_timetable_runs_disruption_id", "timetable_runs", type_="foreignkey")
    op.drop_column("timetable_runs", "disruption_id")
    op.drop_column("timetable_runs", "purpose")
