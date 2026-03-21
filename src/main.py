import dearpygui.dearpygui as dpg
from config import FONT_PATH
from ui.players_list import render_players_list
from ui.main_menu import render_main_content


def main():
    dpg.create_context()

    with dpg.font_registry():
        with dpg.font(FONT_PATH, 20) as default_font:
            dpg.add_font_range_hint(dpg.mvFontRangeHint_Default)
            dpg.add_font_range_hint(dpg.mvFontRangeHint_Cyrillic)

    dpg.bind_font(default_font)

    with dpg.window(tag="PrimaryWindow"):
        with dpg.group(horizontal=True):
            render_players_list()
            render_main_content()

    dpg.create_viewport(title="Rise And Fall - Launcher", width=900, height=600)
    dpg.setup_dearpygui()
    dpg.show_viewport()
    dpg.set_primary_window("PrimaryWindow", True)
    dpg.start_dearpygui()
    dpg.destroy_context()


if __name__ == "__main__":
    main()
