import dearpygui.dearpygui as dpg
from callbacks.connect_to_zt import action_connect_zt
from callbacks.run_game_action import action_run_game


def try_run_game():
    from config import cfg

    game_dir = cfg.get("game_dir")

    if not game_dir or game_dir == 0:
        vw = dpg.get_viewport_client_width()
        vh = dpg.get_viewport_client_height()
        dpg.configure_item(
            "no_path_modal", show=True, pos=[(vw - 385) // 2, (vh - 200) // 2]
        )
    else:
        action_run_game()


def render_main_content():
    if not dpg.does_alias_exist("play_button_theme"):
        with dpg.theme(tag="play_button_theme"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, (46, 204, 113))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (60, 224, 130))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, (39, 174, 96))
                dpg.add_theme_color(dpg.mvThemeCol_Text, (0, 0, 0))
                dpg.add_theme_style(dpg.mvStyleVar_FrameRounding, 5)

    if not dpg.does_alias_exist("no_path_modal"):
        with dpg.window(
            label="Игра не найдена",
            modal=True,
            show=False,
            tag="no_path_modal",
            no_resize=True,
            width=385,
        ):
            dpg.add_text(
                "Похоже, путь к игре еще не установлен.",
                wrap=300,
            )
            dpg.add_spacer(height=10)

            with dpg.group(horizontal=True):
                dpg.add_button(
                    label="Установить игру",
                    width=200,
                    callback=lambda: [
                        dpg.configure_item("no_path_modal", show=False),
                        dpg.show_item("install_dir_dialog"),
                    ],
                )
                dpg.add_button(
                    label="Выбрать путь",
                    width=160,
                    callback=lambda: [
                        dpg.configure_item("no_path_modal", show=False),
                        dpg.show_item("game_dir_dialog"),
                    ],
                )

            dpg.add_button(
                label="Отмена",
                width=-1,
                callback=lambda: dpg.configure_item("no_path_modal", show=False),
            )

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
