from pathlib import Path


def set_game_directory(directory: Path):
    from config import cfg

    cfg.set("game_dir", directory)
    json_dir = cfg.get("game_dir")
    print(f"User has been set {json_dir}")
