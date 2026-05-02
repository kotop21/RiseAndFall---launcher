import dearpygui.dearpygui as dpg

from config import cfg
from callbacks.player_list.plist_send_saves import action_send_saves
from callbacks.launcher_copy_ip import action_copy_ip
from ui.components.ui_add_player import AddPlayerModal


def _send_saves_and_close(sender, app_data, user_data):
    parent = dpg.get_item_parent(sender)
    if parent is not None:
        dpg.configure_item(parent, show=False)
    action_send_saves(sender, app_data, user_data)


def action_delete_player(sender, app_data, user_data):
    player_name = user_data.get("name")
    players = cfg.get("custom_players", [])
    if isinstance(players, list):
        players = [p for p in players if p.get("name") != player_name]
        cfg.set("custom_players", players)
    update_players_ui()


def action_save_player(name, ip):
    players = cfg.get("custom_players", [])
    if not isinstance(players, list):
        players = []
    players.append({"name": name, "ip": ip})
    cfg.set("custom_players", players)
    update_players_ui()


def open_add_player_modal():
    vw = dpg.get_viewport_client_width()
    vh = dpg.get_viewport_client_height()
    dpg.configure_item(
        "add_player_modal", show=True, pos=[(vw - 300) // 2, (vh - 180) // 2]
    )


def update_players_ui(sender=None, app_data=None):
    players = cfg.get("custom_players", [])

    if dpg.does_item_exist("players_list_group"):
        dpg.delete_item("players_list_group", children_only=True)

    if isinstance(players, list):
        for player in players:
            btn = dpg.add_button(
                label=player["name"],
                width=-1,
                parent="players_list_group",
                callback=action_copy_ip,
                user_data=player,
            )

            dpg.bind_item_theme(btn, "player_online_theme")

            with dpg.popup(btn, mousebutton=dpg.mvMouseButton_Right) as popup_id:
                dpg.bind_item_theme(popup_id, "popup_compact_theme")

                dpg.add_button(
                    label="Передать сохранения",
                    callback=_send_saves_and_close,
                    user_data=player,
                    width=270,
                )

                dpg.add_separator()
                dpg.add_button(
                    label="Удалить",
                    callback=action_delete_player,
                    user_data=player,
                    width=270,
                )

    if not players:
        dpg.add_text("Список пуст", color=[150, 150, 150], parent="players_list_group")


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
