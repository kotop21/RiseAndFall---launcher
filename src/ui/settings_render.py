import dearpygui.dearpygui as dpg
from utils.get_short_path import get_short_path
from callbacks.open_setting_dgvoodoo import action_open_dgvoodoo
from callbacks.install_game_action import action_save_launch_args
from callbacks.game_dir_action import (
    wrapped_set_game_dir,
    select_game_dir_native,
    select_install_dir_native,
)


def render_settings_content():
    from config import cfg, res, project_version

    game_dir = cfg.get("game_dir")
    launch_args = cfg.get("launch_args", '-dataPath "Data\\" -redistpath "redist\\"')

    with dpg.child_window(border=False):
        dpg.add_spacer(height=10)
        t1 = dpg.add_text("Управление игрой")
        if res.big_font:
            dpg.bind_item_font(t1, res.big_font)

        dpg.add_separator()
        dpg.add_spacer(height=5)

        dpg.add_button(
            label="Скачать и установить игру",
            width=-1,
            height=35,
            callback=select_install_dir_native,
        )
        dpg.add_spacer(height=5)

        dpg.add_button(
            label=f"Путь: {get_short_path(game_dir) if game_dir else 'Выбрать путь к игре'}",
            callback=select_game_dir_native,
            width=-1,
            tag="btn_game_dir",
        )

        dpg.add_spacer(height=5)
        dpg.add_button(
            label="Открыть настройки dgVoodoo",
            width=-1,
            height=35,
            callback=action_open_dgvoodoo,
        )

        dpg.add_spacer(height=20)
        t2 = dpg.add_text("Параметры запуска")
        if res.big_font:
            dpg.bind_item_font(t2, res.big_font)
        dpg.add_separator()
        dpg.add_spacer(height=5)

        dpg.add_input_text(
            default_value=launch_args,
            width=-1,
            callback=action_save_launch_args,
            tag="launch_args_input",
        )

        dpg.add_spacer(height=40)
        t3 = dpg.add_text("О лаунчере")
        if res.big_font:
            dpg.bind_item_font(t3, res.big_font)
        dpg.add_separator()
        dpg.add_spacer(height=5)

        with dpg.group(horizontal=True):
            dpg.add_text("Разработчик:", color=[150, 150, 150])
            dpg.add_text("xxds", color=[255, 200, 100])
        with dpg.group(horizontal=True):
            dpg.add_text("Версия:", color=[150, 150, 150])
            dpg.add_text(project_version, color=[200, 200, 200])
        dpg.add_text("Спасибо что вы используете наш лаунчер!", color=[150, 150, 150])
