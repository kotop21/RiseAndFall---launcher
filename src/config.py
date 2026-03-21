import os
import sys
from utils.user_config import ConfigManager

zerotier_id = "ebe7fbd445156789"


def resource_path(relative_path):
    base_path = getattr(sys, "_MEIPASS", os.path.abspath("."))

    return os.path.join(base_path, relative_path)


FONT_PATH = resource_path(os.path.join("assets", "Roboto-Regular.ttf"))

PORT = 9911


class AppResources:
    big_font = None


res = AppResources()

cfg = ConfigManager()
