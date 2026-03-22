import dearpygui.dearpygui as dpg
from config import res


def render_utils():
    title_utils = dpg.add_text("Утилиты для игры")
    dpg.bind_item_font(title_utils, res.big_font)
    dpg.add_spacer(height=15)

    with dpg.group(horizontal=True):
        btn_dx = dpg.add_button(label="dxvoodoo", width=180, height=40)
        with dpg.group():
            dpg.add_spacer()
            dpg.add_text(
                "Исправляет графические баги на новых системах", color=(180, 180, 180)
            )

    with dpg.tooltip(btn_dx):
        dpg.add_text("Обертка старых API (DirectX) для современных видеокарт.")

    dpg.add_spacer(height=5)

    with dpg.group(horizontal=True):
        btn_asi = dpg.add_button(label="ASI Loader", width=180, height=40)
        with dpg.group():
            dpg.add_spacer()
            dpg.add_text(
                "Загрузчик плагинов, необходим для работы модов", color=(180, 180, 180)
            )
        with dpg.tooltip(btn_asi):
            dpg.add_text("Ultimate ASI Loader")
