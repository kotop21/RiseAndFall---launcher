import os
import subprocess
from ui.ui_toast import show_toast


def action_open_dgvoodoo():
    from config import cfg

    game_path = cfg.get("game_dir")

    if not game_path:
        show_toast(
            "dgVoodoo",
            title="Ошибка открытия",
            description="Сначала выберите путь к игре",
            duration=2.0,
            color=(255, 0, 0),
        )
        return

    game_dir_path = os.path.dirname(game_path)
    dgvoodoo_path = os.path.join(game_dir_path, "dgVoodooCpl.exe")

    if os.path.exists(dgvoodoo_path):
        subprocess.Popen([dgvoodoo_path], cwd=game_dir_path)
    else:
        show_toast(
            "dgVoodoo",
            description="Файл dgVoodooCpl.exe не найден",
            title="Ошибка запуска",
            duration=2.0,
            color=(255, 0, 0),
        )
