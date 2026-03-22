import dearpygui.dearpygui as dpg
from config import res


def render_mods():
    title_mods = dpg.add_text("Моды")
    dpg.bind_item_font(title_mods, res.big_font)
    dpg.add_spacer(height=15)

    with dpg.group(horizontal=True):
        btn_gfm = dpg.add_button(label="GFM-raf", width=180, height=45)
        with dpg.group():
            dpg.add_spacer()
            dpg.add_text("Ребаланс игры", color=(180, 180, 180))
