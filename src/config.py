import os
import sys
import re
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
