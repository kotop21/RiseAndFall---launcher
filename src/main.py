import dearpygui.dearpygui as dpg
import threading
from config import FONT_PATH, ICON_PATH, res, project_version

from ui import render_header
from ui import render_views
from ui.components import update_modal_ui
from utils.web_server import run_server
from utils.launcher import run_update_checker


def on_launcher_exit():
    from utils.se_run_command import run_se_command

    try:
        run_se_command(["AccountDisconnect", "GameNetwork"])
    except Exception:
        pass


def main():
    dpg.create_context()

    with dpg.font_registry():
        with dpg.font(FONT_PATH, 25) as default_font:
            dpg.add_font_range_hint(dpg.mvFontRangeHint_Default)
            dpg.add_font_range_hint(dpg.mvFontRangeHint_Cyrillic)
        with dpg.font(FONT_PATH, 30) as big_font:
            dpg.add_font_range_hint(dpg.mvFontRangeHint_Cyrillic)

    dpg.bind_font(default_font)
    res.big_font = big_font

    with dpg.window(tag="PrimaryWindow"):
        render_header()
        render_views()

    dpg.create_viewport(
        title=f"Rise And Fall - Launcher {project_version}",
        width=850,
        height=550,
        resizable=False,
        small_icon=ICON_PATH,
        large_icon=ICON_PATH,
    )
    dpg.setup_dearpygui()
    dpg.show_viewport()
    dpg.set_primary_window("PrimaryWindow", True)

    threading.Thread(target=run_server, daemon=True).start()

    if project_version != "dev-build":
        run_update_checker(on_update_available=update_modal_ui)

    # Регистрируем хук на закрытие программы
    dpg.set_exit_callback(on_launcher_exit)

    dpg.start_dearpygui()
    dpg.destroy_context()


if __name__ == "__main__":
    main()
