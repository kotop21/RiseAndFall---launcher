import dearpygui.dearpygui as dpg
from config import cfg
from utils.player_manager import add_player_to_cfg, delete_last_player_from_cfg


def update_players_ui():
    dpg.delete_item("players_list_group", children_only=True)
    players = cfg.get("custom_players")
    if isinstance(players, list):
        for player in players:
            with dpg.group(horizontal=True, parent="players_list_group"):
                dpg.add_text(player["name"])


def callback_save_player(sender, app_data):
    name = dpg.get_value("new_player_name")
    ip = dpg.get_value("new_player_ip")
    if name and ip:
        add_player_to_cfg(name, ip)
        dpg.configure_item("add_player_modal", show=False)
        dpg.set_value("new_player_name", "")
        dpg.set_value("new_player_ip", "")
        update_players_ui()


def callback_delete_player():
    delete_last_player_from_cfg()
    update_players_ui()


def render_players_list():
    with dpg.window(
        label="Новый игрок", modal=True, show=False, tag="add_player_modal", width=300
    ):
        dpg.add_input_text(label="Имя", tag="new_player_name")
        dpg.add_input_text(label="IP", tag="new_player_ip")
        with dpg.group(horizontal=True):
            dpg.add_button(label="Сохранить", callback=callback_save_player, width=140)
            dpg.add_button(
                label="Отмена",
                callback=lambda: dpg.configure_item("add_player_modal", show=False),
                width=140,
            )

    with dpg.child_window(width=200, border=True, tag="players_container"):
        with dpg.group(horizontal=True):
            dpg.add_text("Друзья")
            dpg.add_button(
                label="+",
                callback=lambda: dpg.configure_item("add_player_modal", show=True),
            )
            dpg.add_button(label="-", callback=callback_delete_player)
        dpg.add_separator()
        dpg.add_group(tag="players_list_group")
        update_players_ui()
