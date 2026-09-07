from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    monobank_token: SecretStr = Field(validation_alias="MONOBANK_TOKEN")
    db_path: Path = Field(
        default=Path("./data/monoscope.db"),
        validation_alias="MONOSCOPE_DB_PATH",
    )
    cache_ttl_seconds: int = Field(
        default=600,
        ge=1,
        validation_alias="MONOSCOPE_CACHE_TTL_SECONDS",
    )
    cors_origins: str = Field(
        default="http://localhost:5173",
        validation_alias="MONOSCOPE_CORS_ORIGINS",
    )
    log_level: str = Field(
        default="INFO",
        validation_alias="MONOSCOPE_LOG_LEVEL",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]
