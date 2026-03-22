import os
import subprocess


def run_game():
    from config import cfg

    game_path = cfg.get("game_dir")

    if game_path and game_path.lower().endswith(".exe"):
        if os.path.exists(game_path):
            game_dir = os.path.dirname(game_path)

            cmd = f'"{game_path}" -dataPath "Data\\" -redistpath "redist\\"'

            subprocess.Popen(
                cmd,
                cwd=game_dir,
            )
