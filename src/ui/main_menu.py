import dearpygui.dearpygui as dpg
from callbacks.game_dir_action import action_set_game_dir
from callbacks.connect_to_zt import action_connect_zt
from config import cfg

game_dir = cfg.get("game_dir")


def render_main_content():
    with dpg.file_dialog(
        directory_selector=True,
        show=False,
        callback=action_set_game_dir,
        tag="game_dir_dialog",
        width=500,
        height=300,
    ):
        dpg.add_file_extension(".*")

    with dpg.child_window(border=True):
        dpg.add_button(
            label="Выбрать путь к игре",
            callback=lambda: dpg.show_item("game_dir_dialog"),
        )

        dpg.add_text(f"Путь: {game_dir or 'Не выбран'}", tag="game_dir_text")
        dpg.add_spacer(height=10)
        dpg.add_button(label="Синхронизировать сейвы")
        dpg.add_text("Последний сейв: Нет данных")
        dpg.add_spacer(height=10)
        dpg.add_button(label="Подключить ZeroTier", callback=action_connect_zt)
        dpg.add_text("Статус: Ожидание", tag="zt_status_text")
