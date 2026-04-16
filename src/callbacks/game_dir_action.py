import dearpygui.dearpygui as dpg
from utils.get_short_path import get_short_path


def action_set_game_dir(sender, app_data):
    from config import cfg

    selected_path = app_data["file_path_name"]
    cfg.set("game_dir", selected_path)

    if dpg.does_item_exist("btn_game_dir"):
        dpg.configure_item(
            "btn_game_dir", label=f"Путь: {get_short_path(selected_path)}"
        )
