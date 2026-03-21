import os
import zipfile
from datetime import datetime, date


def create_daily_saves_archive(exe_path, archive_name="daily_saves.zip"):
    game_dir = os.path.dirname(exe_path)
    saves_dir = os.path.join(game_dir, "Data", "Saved Games")

    if not os.path.exists(saves_dir):
        return None, "Папка сейвов не найдена"

    today = date.today()
    files_to_zip = []

    for root, dirs, files in os.walk(saves_dir):
        for file in files:
            file_path = os.path.join(root, file)
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path)).date()

            if file_mtime == today:
                rel_path = os.path.relpath(file_path, saves_dir)
                files_to_zip.append((file_path, rel_path))

    if not files_to_zip:
        return None, "Сегодня сохранений еще не было"

    with zipfile.ZipFile(archive_name, "w", zipfile.ZIP_DEFLATED) as zipf:
        for f_path, rel_p in files_to_zip:
            zipf.write(f_path, rel_p)

    return archive_name, None
