import dearpygui.dearpygui as dpg
from callbacks import (
    action_connect_zt,
    action_run_game,
)
from ui.components.ui_no_path import show_no_path_modal


def try_run_game():
    from config import cfg

    game_dir = cfg.get("game_dir")

    if not game_dir or game_dir == 0:
        show_no_path_modal()
    else:
        action_run_game()


def main_content():
    if not dpg.does_alias_exist("play_button_theme"):
        with dpg.theme(tag="play_button_theme"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, (46, 204, 113))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (60, 224, 130))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, (39, 174, 96))
                dpg.add_theme_color(dpg.mvThemeCol_Text, (0, 0, 0))
                dpg.add_theme_style(dpg.mvStyleVar_FrameRounding, 5)

    with dpg.child_window(border=False):
        dpg.add_spacer(height=10)

        btn_play = dpg.add_button(
            label="ЗАПУСТИТЬ ИГРУ",
            width=-1,
            height=80,
            callback=try_run_game,
        )
        dpg.bind_item_theme(btn_play, "play_button_theme")

        dpg.add_spacer(height=25)
        dpg.add_separator()
        dpg.add_spacer(height=5)

        with dpg.group(horizontal=True):
            dpg.add_button(
                label="Подключиться к сети",
                callback=action_connect_zt,
                width=250,
                tag="zt_btn",
            )
            dpg.add_text(
                "Твой IP: Ожидание...",
                tag="zt_status_ip",
                color=[200, 200, 200],
            )
