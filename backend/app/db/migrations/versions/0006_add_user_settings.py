"""add user settings table"""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ideas_per_run", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("max_sources_per_run", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("cached_analyses_count", sa.Integer(), nullable=False, server_default="5"),
    )


def downgrade():
    op.drop_table("user_settings")
