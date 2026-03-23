import dearpygui.dearpygui as dpg

from ui.players_list_render import render_players_list
from ui.main_menu_render import render_main_content
from ui.utils_render import render_utils
from ui.mods_render import render_mods


def render_views():
    """
    Контейнер для всех страниц. Активная страница имеет show=True, остальные show=False.
    """
    with dpg.group(tag="view_main", show=True):
        with dpg.group(horizontal=True):
            render_players_list()
            render_main_content()

    with dpg.group(tag="view_utils", show=False):
        render_utils()
    with dpg.group(tag="view_mods", show=False):
        render_mods()
