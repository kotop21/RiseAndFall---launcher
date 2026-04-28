import dearpygui.dearpygui as dpg
from ui.ui_toast import show_toast


def action_copy_ip(sender, app_data, user_data):
    ip = ""
    if isinstance(user_data, dict):
        ip = user_data.get("ip", "")
    elif isinstance(user_data, str):
        ip = user_data

    if ip:
        dpg.set_clipboard_text(ip)
        show_toast(
            "IP скопирован",
            description=f"IP: {ip}",
            title="Буфер обмена",
            duration=1.5,
        )
