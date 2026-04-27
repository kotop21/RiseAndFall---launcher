import threading
import time
import re
import dearpygui.dearpygui as dpg
from utils import run_zt_command, install_zerotier
from utils.launcher import admin_check
from config import zerotier_id
from ui.ui_toast import show_toast
from ui.ui_admin_check import admin_warning_ui


def get_zt_ip(zerotier_id):
    try:
        proc = run_zt_command(["listnetworks"])

        for line in proc.stdout.splitlines():
            if zerotier_id in line:
                match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/\d+", line)
                if match:
                    return match.group(1)
    except Exception:
        pass
    return None


def _copy_my_ip(sender, app_data, user_data):
    if user_data:
        dpg.set_clipboard_text(user_data)
        show_toast("IP скопирован", title="Буфер обмена", duration=1.5)


def _start_zt_install():
    dpg.configure_item("zt_btn", label="Скачивание ZT...", enabled=False)
    success, message = install_zerotier()

    if success:
        dpg.configure_item("zt_btn", label="ZT Установлен", enabled=False)
        time.sleep(2)
        _connect_to_zt_network(is_retry=True)
    else:
        dpg.configure_item("zt_btn", label=f"Ошибка: {message}", enabled=True)


def _trigger_zt_install_thread():
    threading.Thread(target=_start_zt_install, daemon=True).start()


def _connect_to_zt_network(is_retry=False):
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

        if admin_check() == 1:
            admin_warning_ui()
            dpg.configure_item("zt_btn", label="Недостаточно прав", enabled=True)
        else:
            _trigger_zt_install_thread()


def action_connect_zt(sender, app_data):
    threading.Thread(target=_connect_to_zt_network, daemon=True).start()
