"""Add metadata_snapshot column to image_slots

Revision ID: 002_add_metadata_snapshot
Revises: 001_add_tv_metadata
Create Date: 2025-12-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_add_metadata_snapshot'
down_revision: Union[str, None] = '001_add_tv_metadata'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add metadata_snapshot column to image_slots table
    # Using batch mode for SQLite compatibility
    with op.batch_alter_table('image_slots') as batch_op:
        batch_op.add_column(sa.Column('metadata_snapshot', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove metadata_snapshot column from image_slots table
    with op.batch_alter_table('image_slots') as batch_op:
        batch_op.drop_column('metadata_snapshot')

