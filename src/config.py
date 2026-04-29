import os
import sys
from utils.launcher import ConfigManager
from typing import Union, Optional

try:
    from credentials import SE_HOST, SE_HUB, SE_USER, SE_PASS
except ImportError:
    SE_HOST = "localhost:443"
    SE_HUB = "DEFAULT"
    SE_USER = "user"
    SE_PASS = "password"


def resource_path(relative_path):
    base_path = getattr(sys, "_MEIPASS", os.path.abspath("."))
    return os.path.join(base_path, relative_path)


FONT_PATH = resource_path(os.path.join("assets", "ofont.ru_Fixedsys.ttf"))
ICON_PATH = resource_path(os.path.join("assets", "icon.ico"))
PORT = 9911


class AppResources:
    big_font: Optional[Union[int, str]] = None


res = AppResources()
cfg = ConfigManager()

try:
    from version import PROJECT_VERSION

    project_version = f"v{PROJECT_VERSION}"
except ImportError:
    project_version = "dev-build"


def get_exe_path():
    return cfg.get("game_dir")


def get_game_dir():
    exe_path = get_exe_path()
    if exe_path and isinstance(exe_path, str) and os.path.exists(exe_path):
        return os.path.dirname(exe_path)
    return None


def get_saves_dir():
    game_dir = get_game_dir()
    if game_dir:
        return os.path.join(game_dir, "Data", "Saved Games")
    return None
