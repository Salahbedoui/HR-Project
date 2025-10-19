from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.models.resume import Resume

# 👇 import your models here
from app.core.database import Base
from app.models.candidate import Candidate

# ✅ This is the one Alembic needs
target_metadata = Base.metadata
# ----------------------------------------------------------------

# Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# other values from the config can be used here if needed
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

# ----------------------------------------------------------------
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,  # ✅ keep this one
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,  # ✅ keep this one
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
