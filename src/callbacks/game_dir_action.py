from pathlib import Path
from utils.set_game_directory import set_game_directory
import dearpygui.dearpygui as dpg


def action_set_game_dir(sender, app_data):
    if app_data is None:
        return
    selected_path = app_data.get("file_path_name", "Файл не выбран")
    set_game_directory(selected_path)
    dpg.set_value("game_dir_text", f"Путь: {selected_path}")
