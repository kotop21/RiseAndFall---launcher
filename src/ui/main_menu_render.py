import dearpygui.dearpygui as dpg
from utils.get_short_path import get_short_path
from callbacks.game_dir_action import action_set_game_dir
from callbacks.connect_to_zt import action_connect_zt
from callbacks.run_game_action import action_run_game
from config import cfg

game_dir = cfg.get("game_dir")


def render_main_content():
    with dpg.theme(tag="play_button_theme"):
        with dpg.theme_component(dpg.mvButton):
            dpg.add_theme_color(dpg.mvThemeCol_Button, (46, 204, 113))
            dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (60, 224, 130))
            dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, (39, 174, 96))
            dpg.add_theme_color(dpg.mvThemeCol_Text, (0, 0, 0))
            dpg.add_theme_style(dpg.mvStyleVar_FrameRounding, 5)

    with dpg.file_dialog(
        directory_selector=False,
        show=False,
        callback=action_set_game_dir,
        tag="game_dir_dialog",
        width=500,
        height=300,
    ):
        dpg.add_file_extension("Executable (*.exe){.exe}")
        dpg.add_file_extension(".*")

    with dpg.child_window(border=False):
        dpg.add_spacer(height=10)

        dpg.add_button(
            label="ЗАПУСТИТЬ ИГРУ",
            width=-1,
            height=80,
            tag="btn_play",
            callback=action_run_game,
        )
        dpg.bind_item_theme("btn_play", "play_button_theme")

        # dpg.add_spacer(height=5)
        # with dpg.group(horizontal=True):
        #     dpg.add_button(label="Настройки dxvoodoo", width=250, height=30)

        dpg.add_spacer(height=5)
        dpg.add_separator()
        dpg.add_spacer(height=20)

        with dpg.group(width=-1):
            dpg.add_button(
                label="Выбрать путь к игре",
                callback=lambda: dpg.show_item("game_dir_dialog"),
                width=-1,
            )
            dpg.add_text(
                f"Путь: {get_short_path(game_dir)}",
                tag="game_dir_text",
                color=[200, 200, 200],
            )

        dpg.add_spacer(height=15)

        with dpg.group(width=-1):
            dpg.add_button(
                label="Подключиться к сети",
                callback=action_connect_zt,
                width=-1,
                tag="zt_btn",
            )
            dpg.add_text(
                "Твой IP: Ожидание...", tag="zt_status_ip", color=[200, 200, 200]
            )
