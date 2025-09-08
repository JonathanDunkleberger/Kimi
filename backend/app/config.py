from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_ENV: str = "dev"
    DATABASE_URL: str = "sqlite+aiosqlite:///./dev.db"
    SECRET_KEY: str = "change_me"
    ADMIN_TOKEN: str = "change_me_admin"
    INITIAL_CREDITS: int = 1000
    TIMEZONE: str = "UTC"

    HTTP_USER_AGENT: str = "ValorantPropsMVP/0.1 (contact@example.com)"
    LIQUIPEDIA_RATE_PER_MIN: int = 20
    VLR_RATE_PER_MIN: int = 8

    LIQUIPEDIA_BASE: str = "https://liquipedia.net"
    LIQUIPEDIA_GAME: str = "valorant"

    LOCK_WINDOW_MIN: int = 5

    # Allowlist for the image proxy (/img)
    ALLOWED_IMG_HOSTS: str = "liquipedia.net,upload.wikimedia.org,static.wikia.nocookie.net,cdn.7tv.app,pbs.twimg.com,abs.twimg.com,i.imgur.com"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
