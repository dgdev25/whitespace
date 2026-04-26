"""add prd to build_outputs"""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("build_outputs", sa.Column("prd", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("build_outputs", "prd")
