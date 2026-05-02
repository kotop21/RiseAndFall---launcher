import dearpygui.dearpygui as dpg
from callbacks.se_connect import action_connect_se
from callbacks import action_run_game
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

    if not dpg.does_alias_exist("vpn_theme_default"):
        with dpg.theme(tag="vpn_theme_default"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, (26, 82, 118))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (31, 97, 141))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, (21, 67, 96))
                dpg.add_theme_color(dpg.mvThemeCol_Text, (255, 255, 255))

    if not dpg.does_alias_exist("vpn_theme_loading"):
        with dpg.theme(tag="vpn_theme_loading"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, (166, 108, 0))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (186, 128, 20))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, (146, 88, 0))
                dpg.add_theme_color(dpg.mvThemeCol_Text, (255, 255, 255))

    if not dpg.does_alias_exist("vpn_theme_connected"):
        with dpg.theme(tag="vpn_theme_connected"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, (45, 55, 65))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (55, 65, 75))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, (35, 45, 55))
                dpg.add_theme_color(dpg.mvThemeCol_Text, (180, 190, 200))

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

        btn_vpn = dpg.add_button(
            label="Подключиться к сети",
            callback=action_connect_se,
            width=-1,
            tag="vpn_btn",
        )
        dpg.bind_item_theme(btn_vpn, "vpn_theme_default")
