import os
import json
from typing import Any, Dict, Optional


class ConfigManager:
    base_conf_name: str
    config_path: str

    def __init__(self, base_conf_name: str = "config") -> None:
        self.base_conf_name = base_conf_name
        self.config_path = self._get_path()
        self.create_config()

    def _get_path(self) -> str:
        appdata: Optional[str] = os.getenv("APPDATA")
        base_dir: str = appdata if appdata else os.getcwd()
        launcher_dir = os.path.join(base_dir, "RafLauncher")
        if not os.path.exists(launcher_dir):
            os.makedirs(launcher_dir)

        return os.path.join(launcher_dir, f"{self.base_conf_name}.json")

    def create_config(self) -> None:
        if not os.path.exists(self.config_path):
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def set(self, key: str, value: Any) -> None:
        self.create_config()
        data: Dict[str, Any]
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            data = {}

        data[key] = value

        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    def get(self, key: str, default: Any = 0) -> Any:
        if not os.path.exists(self.config_path):
            return default

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data: Dict[str, Any] = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return default

        return data.get(key, default)
