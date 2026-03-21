import dearpygui.dearpygui as dpg
from utils.player_manager import add_player_to_cfg


def action_save_player(sender, app_data):
    from ui.players_list import update_players_ui

    name = dpg.get_value("new_player_name")
    ip = dpg.get_value("new_player_ip")
    if name and ip:
        add_player_to_cfg(name, ip)
        dpg.configure_item("add_player_modal", show=False)
        dpg.set_value("new_player_name", "")
        dpg.set_value("new_player_ip", "")
        update_players_ui()
