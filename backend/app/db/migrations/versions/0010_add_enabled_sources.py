"""add enabled_sources to user_settings"""

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user_settings", sa.Column("enabled_sources", sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("enabled_sources")
