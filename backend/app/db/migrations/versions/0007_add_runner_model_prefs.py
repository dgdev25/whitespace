"""add runner_model_prefs to user_settings"""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_settings",
        sa.Column("runner_model_prefs", sa.JSON(), nullable=False, server_default="{}"),
    )


def downgrade():
    op.drop_column("user_settings", "runner_model_prefs")
