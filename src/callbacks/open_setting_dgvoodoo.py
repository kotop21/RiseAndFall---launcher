import os
import subprocess
from utils.launcher_toast import show_toast


def action_open_dgvoodoo():
    from config import cfg

    game_path = cfg.get("game_dir")

    if not game_path:
        show_toast("Сначала выберите путь к игре", title="Ошибка", color=(255, 0, 0))
        return

    game_dir_path = os.path.dirname(game_path)
    dgvoodoo_path = os.path.join(game_dir_path, "dgVoodooCpl.exe")

    if os.path.exists(dgvoodoo_path):
        subprocess.Popen([dgvoodoo_path], cwd=game_dir_path)
    else:
        show_toast("Файл dgVoodooCpl.exe не найден", title="Ошибка", color=(255, 0, 0))
