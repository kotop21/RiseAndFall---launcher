import os
import threading
import time
import re
import dearpygui.dearpygui as dpg
from utils.install_zt import install_zerotier
from utils.get_zt_path import run_zt_command
from utils.notifications import show_toast


def get_zt_ip(zerotier_id):
    try:
        proc = run_zt_command(["listnetworks"])

        for line in proc.stdout.splitlines():
            if zerotier_id in line:
                match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/\d+", line)
                if match:
                    return match.group(1)
    except Exception as e:
        print(f"Ошибка получения IP: {e}")
    return None


def _copy_my_ip(sender, app_data, user_data):
    if user_data:
        dpg.set_clipboard_text(user_data)
        show_toast(f"IP скопирован", title="Буфер обмена", duration=1.5)


def connect_to_zt_network(is_retry=False):
    from config import zerotier_id

    try:
        dpg.configure_item("zt_btn", enabled=False)

        check_proc = run_zt_command(["listnetworks"])

        if zerotier_id in check_proc.stdout:
            ip = get_zt_ip(zerotier_id)
            dpg.set_value("zt_status_ip", f"Твой IP: {ip if ip else 'Получение...'}")
            dpg.configure_item(
                "zt_btn",
                label="Уже в сети",
                enabled=True,
                callback=_copy_my_ip,
                user_data=ip,
            )
            return

        dpg.configure_item("zt_btn", label="Подключение...", enabled=False)

        join_proc = run_zt_command(["join", zerotier_id])

        if join_proc.returncode == 0:
            dpg.configure_item("zt_btn", label="Подключено", enabled=False)
            ip = None
            for _ in range(5):
                time.sleep(1)
                ip = get_zt_ip(zerotier_id)
                if ip:
                    dpg.set_value("zt_status_ip", f"Твой IP: {ip}")
                    break

            dpg.configure_item(
                "zt_btn",
                label="Уже в сети",
                enabled=True,
                callback=_copy_my_ip,
                user_data=ip,
            )
        else:
            dpg.configure_item("zt_btn", label="Ошибка сети", enabled=True)

    except FileNotFoundError:
        if is_retry:
            dpg.configure_item(
                "zt_btn", label="Перезапустите приложение", enabled=False
            )
            return

        dpg.configure_item("zt_btn", label="Скачивание ZT...", enabled=False)
        success, message = install_zerotier()

        if success:
            dpg.configure_item("zt_btn", label="ZT Установлен", enabled=False)
            time.sleep(2)
            connect_to_zt_network(is_retry=True)
        else:
            dpg.configure_item("zt_btn", label=f"Ошибка: {message}", enabled=True)


def action_connect_zt(sender, app_data):
    threading.Thread(target=connect_to_zt_network, daemon=True).start()
