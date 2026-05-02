import threading
import subprocess
import platform
import time
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


def _check_ping(ip):
    try:
        param = "-n" if platform.system().lower() == "windows" else "-c"
        timeout_param = "-w" if platform.system().lower() == "windows" else "-W"
        timeout_val = "1000" if platform.system().lower() == "windows" else "1"
        command = ["ping", param, "1", timeout_param, timeout_val, ip]

        kwargs = {}
        if platform.system().lower() == "windows":
            kwargs["creationflags"] = 0x08000000

        result = subprocess.run(
            command, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT, **kwargs
        )
        return result.returncode == 0
    except Exception:
        return False


def _refresh_players_thread():
    if dpg.does_item_exist("refresh_players_btn"):
        dpg.configure_item("refresh_players_btn", enabled=False, label="Поиск...")

    players = cfg.get("custom_players", [])

    if dpg.does_item_exist("players_list_group"):
        dpg.delete_item("players_list_group", children_only=True)

    if isinstance(players, list) and players:
        for player in players:
            is_online = _check_ping(player["ip"])

            if not dpg.does_item_exist("players_list_group"):
                break

            btn = dpg.add_button(
                label=player["name"],
                width=-1,
                parent="players_list_group",
                callback=action_copy_ip,
                user_data=player,
            )

            if is_online:
                dpg.bind_item_theme(btn, "player_online_theme")
            else:
                dpg.bind_item_theme(btn, "player_offline_theme")

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
    else:
        if dpg.does_item_exist("players_list_group"):
            dpg.add_text(
                "Список пуст", color=[150, 150, 150], parent="players_list_group"
            )

    if dpg.does_item_exist("refresh_players_btn"):
        dpg.configure_item("refresh_players_btn", enabled=True, label="Обновить")


def update_players_ui(sender=None, app_data=None):
    if dpg.does_item_exist("refresh_players_btn"):
        if dpg.get_item_label("refresh_players_btn") == "Поиск...":
            return
    threading.Thread(target=_refresh_players_thread, daemon=True).start()


def _auto_refresh_loop():
    time.sleep(20)
    while True:
        if not dpg.does_item_exist("players_list_group"):
            break
        update_players_ui()
        time.sleep(20)


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
        threading.Thread(target=_auto_refresh_loop, daemon=True).start()
