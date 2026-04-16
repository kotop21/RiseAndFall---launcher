import dearpygui.dearpygui as dpg
from callbacks.mods import action_install_mods


def render_mods():
    from config import res

    dpg.add_spacer(height=10)
    title_mods = dpg.add_text("Моды")
    dpg.bind_item_font(title_mods, res.big_font)
    dpg.add_spacer(height=15)

    with dpg.group(horizontal=True):
        btn_gfm = dpg.add_button(
            label="GFM-raf",
            width=180,
            height=45,
            callback=action_install_mods,
            user_data="gfm-raf",
        )
        with dpg.group():
            dpg.add_spacer()
            dpg.add_text("Ребаланс игры", color=(180, 180, 180))
    with dpg.group(horizontal=True):
        btn_gfm = dpg.add_button(
            label="DgVoodoo2",
            width=180,
            height=45,
            callback=action_install_mods,
            user_data="dgVoodoo2",
        )
        with dpg.group():
            dpg.add_spacer()
            dpg.add_text(
                "Улучшает совместимость игры с новыми системами.\nТакже помогает если игра не запускается.",
                color=(180, 180, 180),
            )
