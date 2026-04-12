from pathlib import Path


def get_short_path(path_str: str) -> str:
    if not path_str:
        return "Не выбран"
    p = Path(path_str)
    parts = p.parts
    if len(parts) <= 2:
        return str(p)
    return f".../{parts[-2]}/{parts[-1]}"
