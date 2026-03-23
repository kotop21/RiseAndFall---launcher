import subprocess


def run_game():
    from config import get_exe_path, get_game_dir

    exe_path = get_exe_path()
    game_dir = get_game_dir()

    if exe_path and exe_path.lower().endswith(".exe") and game_dir:
        cmd = f'"{exe_path}" -dataPath "Data\\" -redistpath "redist\\"'

        subprocess.Popen(
            cmd,
            cwd=game_dir,
            shell=True,
        )
