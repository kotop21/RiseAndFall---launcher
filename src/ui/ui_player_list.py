import dearpygui.dearpygui as dpg
from callbacks.player_list.plist_actions import update_players_ui, open_add_player_modal
from ui.components.ui_add_player import AddPlayerModal


def players_list_content():
    AddPlayerModal().show(is_shown=False)

    if not dpg.does_item_exist("player_online_theme"):
        with dpg.theme(tag="player_online_theme"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, [0, 0, 0, 0])
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, [46, 204, 113, 30])
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, [46, 204, 113, 60])
                dpg.add_theme_color(dpg.mvThemeCol_Text, [46, 204, 113, 255])
                dpg.add_theme_style(dpg.mvStyleVar_ButtonTextAlign, 0.0, 0.5)

    if not dpg.does_item_exist("player_offline_theme"):
        with dpg.theme(tag="player_offline_theme"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, [0, 0, 0, 0])
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, [231, 76, 60, 30])
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, [231, 76, 60, 60])
                dpg.add_theme_color(dpg.mvThemeCol_Text, [231, 76, 60, 255])
                dpg.add_theme_style(dpg.mvStyleVar_ButtonTextAlign, 0.0, 0.5)

    if not dpg.does_item_exist("popup_compact_theme"):
        with dpg.theme(tag="popup_compact_theme"):
            with dpg.theme_component(dpg.mvAll):
                dpg.add_theme_style(dpg.mvStyleVar_WindowPadding, 4.0, 4.0)
                dpg.add_theme_style(dpg.mvStyleVar_ItemSpacing, 4.0, 4.0)

    with dpg.child_window(width=240, border=True, tag="players_container"):
        with dpg.group(horizontal=True):
            dpg.add_text("Игроки")
            dpg.add_button(label="+", callback=open_add_player_modal)
            dpg.add_button(
                label="Обновить", tag="refresh_players_btn", callback=update_players_ui
            )

        dpg.add_separator()
        dpg.add_group(tag="players_list_group")

        update_players_ui()
