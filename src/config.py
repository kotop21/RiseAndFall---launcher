import os
import sys
import re
from utils import ConfigManager
from typing import Union, Optional


zerotier_id = "ebe7fbd445156789"


def resource_path(relative_path):
    base_path = getattr(sys, "_MEIPASS", os.path.abspath("."))
    return os.path.join(base_path, relative_path)


FONT_PATH = resource_path(os.path.join("assets", "ofont.ru_Fixedsys.ttf"))

PORT = 9911


class AppResources:
    big_font: Optional[Union[int, str]] = None


res = AppResources()
cfg = ConfigManager()


def _get_project_version():
    try:
        if hasattr(sys, "_MEIPASS"):
            toml_path = resource_path("pyproject.toml")
        else:
            root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            toml_path = os.path.join(root_dir, "pyproject.toml")

        with open(toml_path, "r", encoding="utf-8") as f:
            content = f.read()
            match = re.search(
                r'^version\s*=\s*["\']([^"\']+)["\']', content, re.MULTILINE
            )
            if match:
                return match.group(1)
    except Exception:
        pass
    return "0.0.0"


project_version = _get_project_version()


def get_exe_path():
    """Возвращает путь к .exe игры из конфига."""
    return cfg.get("game_dir")


def get_game_dir():
    """Возвращает папку в которой лежит .exe игры."""
    exe_path = get_exe_path()
    if exe_path and isinstance(exe_path, str) and os.path.exists(exe_path):
        return os.path.dirname(exe_path)
    return None


def get_saves_dir():
    """Возвращает путь к папке сохранений."""
    game_dir = get_game_dir()
    if game_dir:
        return os.path.join(game_dir, "Data", "Saved Games")
    return None
