import os
from utils.user_config import ConfigManager

zerotier_id = "ebe7fbd445156789"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = os.path.join(BASE_DIR, "assets", "Roboto-Regular.ttf")

cfg = ConfigManager()
