"""add run_id to ideas"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("ideas", sa.Column("run_id", sa.String(), nullable=True))


def downgrade():
    op.drop_column("ideas", "run_id")
