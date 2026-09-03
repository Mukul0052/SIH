from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Unified Legal Metrology Verification System"
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
