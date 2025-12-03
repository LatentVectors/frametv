"""Add TV metadata fields to tv_content_mappings

Revision ID: 001_add_tv_metadata
Revises: 
Create Date: 2025-12-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_add_tv_metadata'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add TV metadata columns to tv_content_mappings table
    # Using batch mode for SQLite compatibility
    with op.batch_alter_table('tv_content_mappings') as batch_op:
        batch_op.add_column(sa.Column('category_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('width', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('height', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('matte_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('portrait_matte_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('image_date', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('content_type', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove TV metadata columns from tv_content_mappings table
    with op.batch_alter_table('tv_content_mappings') as batch_op:
        batch_op.drop_column('content_type')
        batch_op.drop_column('image_date')
        batch_op.drop_column('portrait_matte_id')
        batch_op.drop_column('matte_id')
        batch_op.drop_column('height')
        batch_op.drop_column('width')
        batch_op.drop_column('category_id')

