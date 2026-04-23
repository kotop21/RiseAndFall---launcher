import dearpygui.dearpygui as dpg

from utils import show_toast


def copy_ip_to_clipboard(sender, app_data, user_data):
    player_ip = user_data.get("ip", "")
    if player_ip:
        dpg.set_clipboard_text(player_ip)
        show_toast(f"IP скопирован", title="Буфер обмена", duration=1.5)
