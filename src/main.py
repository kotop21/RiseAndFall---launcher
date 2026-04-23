import dearpygui.dearpygui as dpg
import threading
from config import FONT_PATH, res, project_version

from ui import render_header
from ui import render_views
from utils.web_server import run_server
from utils import run_update_checker


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
        title=f"Rise And Fall - Launcher v{project_version}",
        width=850,
        height=550,
        resizable=False,
    )
    dpg.setup_dearpygui()
    dpg.show_viewport()
    dpg.set_primary_window("PrimaryWindow", True)

    threading.Thread(target=run_server, daemon=True).start()

    run_update_checker()

    dpg.start_dearpygui()
    dpg.destroy_context()


if __name__ == "__main__":
    main()
