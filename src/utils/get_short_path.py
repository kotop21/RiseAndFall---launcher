import os


def get_short_path(path):
    if not path or path == "Не выбран":
        return "Не выбран"
    parts = os.path.normpath(path).split(os.sep)
    return f".../{parts[-1]}" if len(parts) > 0 else path
