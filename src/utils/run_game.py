import subprocess


def run_game():
    from config import get_exe_path, get_game_dir, cfg

    exe_path = get_exe_path()
    game_dir = get_game_dir()
    launch_args = cfg.get("launch_args", '-dataPath "Data\\" -redistpath "redist\\"')

    if exe_path and exe_path.lower().endswith(".exe") and game_dir:
        cmd = f'"{exe_path}" {launch_args}'
        subprocess.Popen(
            cmd,
            cwd=game_dir,
            shell=True,
        )
