import dearpygui.dearpygui as dpg
from utils.get_short_path import get_short_path
from utils.notifications import show_toast
from callbacks.game_dir_action import action_set_game_dir
from callbacks.install_game_action import (
    action_select_install_dir,
    action_save_launch_args,
)


def wrapped_set_game_dir(sender, app_data):
    action_set_game_dir(sender, app_data)
    if dpg.does_alias_exist("no_path_modal"):
        dpg.configure_item("no_path_modal", show=False)
    show_toast("Путь успешно установлен", title="Система")


def render_settings_content():
    from config import cfg, res, project_version

    game_dir = cfg.get("game_dir")
    launch_args = cfg.get("launch_args", '-dataPath "Data\\" -redistpath "redist\\"')

    if not dpg.does_alias_exist("game_dir_dialog"):
        with dpg.file_dialog(
            directory_selector=False,
            show=False,
            callback=wrapped_set_game_dir,
            tag="game_dir_dialog",
            width=500,
            height=300,
        ):
            dpg.add_file_extension("Executable (*.exe){.exe}")
            dpg.add_file_extension(".*")

    if not dpg.does_alias_exist("install_dir_dialog"):
        with dpg.file_dialog(
            directory_selector=True,
            show=False,
            callback=action_select_install_dir,
            tag="install_dir_dialog",
            width=500,
            height=300,
        ):
            pass

    with dpg.child_window(border=False):
        dpg.add_spacer(height=10)
        title_game_settings = dpg.add_text("Управление игрой")
        if res.big_font:
            dpg.bind_item_font(title_game_settings, res.big_font)

        dpg.add_separator()
        dpg.add_spacer(height=5)

        dpg.add_button(
            label="Скачать и установить игру",
            width=-1,
            height=35,
            callback=lambda: dpg.show_item("install_dir_dialog"),
        )

        dpg.add_spacer(height=5)

        dpg.add_button(
            label=f"Путь: {get_short_path(game_dir) if game_dir else 'Выбрать путь к игре'}",
            callback=lambda: dpg.show_item("game_dir_dialog"),
            width=-1,
            tag="btn_game_dir",
        )

        dpg.add_spacer(height=20)
        title_game_start_param = dpg.add_text("Параметры запуска")
        if res.big_font:
            dpg.bind_item_font(title_game_start_param, res.big_font)

        dpg.add_separator()
        dpg.add_spacer(height=5)

        dpg.add_input_text(
            default_value=launch_args,
            width=-1,
            callback=action_save_launch_args,
            tag="launch_args_input",
        )

        dpg.add_spacer(height=40)
        title_about = dpg.add_text("О лаунчере")
        if res.big_font:
            dpg.bind_item_font(title_about, res.big_font)

        dpg.add_separator()
        dpg.add_spacer(height=5)

        with dpg.group(horizontal=True):
            dpg.add_text("Разработчик:", color=[150, 150, 150])
            dpg.add_text("xxds", color=[255, 200, 100])

        with dpg.group(horizontal=True):
            dpg.add_text("Версия:", color=[150, 150, 150])
            dpg.add_text(project_version, color=[200, 200, 200])

        # with dpg.group(horizontal=True):
        #     dpg.add_text("Интерфейс:", color=[150, 150, 150])
        #     dpg.add_text("DearPyGui", color=[200, 200, 200])
        dpg.add_text("Спасибо что вы используете наш лаунчер!", color=[150, 150, 150])
