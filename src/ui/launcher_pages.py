import dearpygui.dearpygui as dpg
from .page_main import main_content
from .page_mods import mods_content
from .page_settings import settings_content
from .ui_player_list import players_list_content


def render_views():
    with dpg.group(tag="view_main", show=True):
        with dpg.group(horizontal=True):
            players_list_content()
            main_content()

    with dpg.group(tag="view_mods", show=False):
        mods_content()

    with dpg.group(tag="view_settings", show=False):
        settings_content()
