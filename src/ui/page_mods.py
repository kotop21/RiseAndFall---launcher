import dearpygui.dearpygui as dpg
from callbacks.game_mods import action_install_mods
from utils.launcher.launcher_ui_big_font import set_big_font


def mods_content():
    with dpg.child_window(border=False):
        dpg.add_spacer(height=10)
        title_mods = dpg.add_text("Моды/Утилиты")
        set_big_font(title_mods)
        dpg.add_separator()
        dpg.add_spacer(height=15)

        with dpg.group(horizontal=True):
            _btn_gfm = dpg.add_button(
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
            _dgvoodoo = dpg.add_button(
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

        dpg.add_spacer(height=10)
        title_asi_mods = dpg.add_text("Asi mods")
        set_big_font(title_asi_mods)
        dpg.add_separator()
        dpg.add_spacer(height=15)
        with dpg.group(horizontal=True):
            _ultimate_asi_loader = dpg.add_button(
                label="Asi loader",
                width=180,
                height=45,
                callback=action_install_mods,
                user_data="asi_loader",
            )
            with dpg.group():
                dpg.add_spacer()
                dpg.add_text(
                    "Требуется для RafLoader и не только.",
                    color=(180, 180, 180),
                )
        with dpg.group(horizontal=True):
            _raf_loader = dpg.add_button(
                label="RafLoader",
                width=180,
                height=45,
                callback=action_install_mods,
                user_data="raf_loader",
            )
            with dpg.group():
                dpg.add_spacer()
                dpg.add_text(
                    "Требуется для работы lua модов.",
                    color=(180, 180, 180),
                )

        dpg.add_spacer(height=10)
        title_lua_mods = dpg.add_text("Lua mods")
        set_big_font(title_lua_mods)
        dpg.add_separator()
        dpg.add_spacer(height=15)
        with dpg.group(horizontal=True):
            _crash_fix = dpg.add_button(
                label="Crash Fixer",
                width=180,
                height=45,
                callback=action_install_mods,
                user_data="crash_fixer",
            )
            with dpg.group():
                dpg.add_spacer()
                dpg.add_text(
                    "Исправляет частые краши.",
                    color=(180, 180, 180),
                )
