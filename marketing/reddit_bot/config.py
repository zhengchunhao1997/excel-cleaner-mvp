import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "python:excel-cleaner-bot:v1.0 (by /u/YourUsername)")
REDDIT_USERNAME = os.getenv("REDDIT_USERNAME")
REDDIT_PASSWORD = os.getenv("REDDIT_PASSWORD")
PROXY_SERVER = os.getenv("PROXY_SERVER", "http://127.0.0.1:7890") # Default to common local proxy

# Validation
def validate_config():
    missing = []
    if not REDDIT_CLIENT_ID: missing.append("REDDIT_CLIENT_ID")
    if not REDDIT_CLIENT_SECRET: missing.append("REDDIT_CLIENT_SECRET")
    if not REDDIT_USERNAME: missing.append("REDDIT_USERNAME")
    if not REDDIT_PASSWORD: missing.append("REDDIT_PASSWORD")
    
    if missing:
        return False, f"Missing configuration: {', '.join(missing)}"
    return True, "Configuration valid"
