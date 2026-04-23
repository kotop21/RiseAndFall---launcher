import dearpygui.dearpygui as dpg
from ui import (
    render_players_list,
    render_settings_content,
    render_mods,
    render_main_content,
)


def render_views():
    with dpg.group(tag="view_main", show=True):
        with dpg.group(horizontal=True):
            render_players_list()
            render_main_content()

    with dpg.group(tag="view_mods", show=False):
        render_mods()

    with dpg.group(tag="view_settings", show=False):
        render_settings_content()
