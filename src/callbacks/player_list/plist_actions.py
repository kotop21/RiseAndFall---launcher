import threading
import dearpygui.dearpygui as dpg

from config import cfg
from callbacks.player_list.plist_send_saves import action_send_saves
from utils.network_scanner import get_active_ips


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


def _refresh_players_thread():
    if dpg.does_item_exist("refresh_players_btn"):
        dpg.configure_item("refresh_players_btn", enabled=False, label="Поиск...")

    active_ips = get_active_ips()
    players = cfg.get("custom_players", [])

    if dpg.does_item_exist("players_list_group"):
        dpg.delete_item("players_list_group", children_only=True)

    if isinstance(players, list):
        for player in players:
            is_online = player["ip"] in active_ips

            btn = dpg.add_button(
                label=player["name"],
                width=-1,
                parent="players_list_group",
            )

            # Красим кнопку в зависимости от статуса
            if is_online:
                dpg.bind_item_theme(btn, "player_online_theme")
            else:
                dpg.bind_item_theme(btn, "player_offline_theme")

            # Контекстное меню
            with dpg.popup(btn, mousebutton=dpg.mvMouseButton_Right) as popup_id:
                dpg.bind_item_theme(popup_id, "popup_compact_theme")

                if is_online:
                    dpg.add_button(
                        label="Передать сохранения",
                        callback=_send_saves_and_close,
                        user_data=player,
                        width=270,
                    )
                else:
                    dpg.add_text("Игрок не в сети", color=[150, 150, 150])

                dpg.add_separator()
                dpg.add_button(
                    label="Удалить",
                    callback=action_delete_player,
                    user_data=player,
                    width=270,
                )

    if not players:
        dpg.add_text("Список пуст", color=[150, 150, 150], parent="players_list_group")

    if dpg.does_item_exist("refresh_players_btn"):
        dpg.configure_item("refresh_players_btn", enabled=True, label="Обновить")


def update_players_ui(sender=None, app_data=None):
    threading.Thread(target=_refresh_players_thread, daemon=True).start()
