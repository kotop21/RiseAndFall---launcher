import os
from .registry import INSTALL_CONFIGS
from .downloader import download_file
from .extractor import extract_and_cleanup


class InstallManager:
    @staticmethod
    def process_installation(utility_name: str) -> tuple[bool, str]:
        from config import get_game_dir

        if utility_name not in INSTALL_CONFIGS:
            return False, "Неизвестный мод"

        game_dir = get_game_dir()
        if not game_dir:
            return False, "Путь к игре не установлен"

        config = INSTALL_CONFIGS[utility_name]
        url = config["url"]
        filename = config["filename"]
        subfolder = config.get("subfolder", "")
        ignore_list = config.get("ignore", [])

        target_dir = game_dir
        if subfolder:
            target_dir = os.path.normpath(os.path.join(game_dir, subfolder))

        try:
            archive_path = download_file(url, filename)
            extract_and_cleanup(archive_path, target_dir, ignore_list)
            return True, "Успешно"
        except Exception as e:
            return False, str(e)
