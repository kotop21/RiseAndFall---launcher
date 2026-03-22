import os
import shutil
import subprocess
import threading
import time
import re
import platform
import dearpygui.dearpygui as dpg
from utils.install_zt import install_zerotier


def get_zt_cmd():
    cmd = shutil.which("zerotier-cli")
    if cmd:
        return cmd
    if platform.system() == "Windows":
        fallback = r"C:\ProgramData\ZeroTier\One\zerotier-cli.bat"
        if os.path.exists(fallback):
            return fallback
    elif platform.system() == "Darwin":
        for fallback in [
            "/usr/local/bin/zerotier-cli",
            "/Library/Application Support/ZeroTier/One/zerotier-cli",
        ]:
            if os.path.exists(fallback):
                return fallback
    return "zerotier-cli"


def get_zt_ip(zerotier_id):
    try:
        cmd = get_zt_cmd()
        kwargs = {}
        if platform.system() == "Windows":
            kwargs["creationflags"] = 0x08000000

        proc = subprocess.run(
            [cmd, "listnetworks"], capture_output=True, text=True, **kwargs
        )
        for line in proc.stdout.splitlines():
            if zerotier_id in line:
                match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/\d+", line)
                if match:
                    return match.group(1)
    except Exception:
        pass
    return None


def connect_to_zt_network(is_retry=False):
    from config import zerotier_id

    cmd = get_zt_cmd()
    kwargs = {}
    if platform.system() == "Windows":
        kwargs["creationflags"] = 0x08000000

    try:
        # Отключаем кнопку на время процесса, чтобы не спамили нажатиями
        dpg.configure_item("zt_status_text", enabled=False)

        check_proc = subprocess.run(
            [cmd, "listnetworks"], capture_output=True, text=True, **kwargs
        )

        if zerotier_id in check_proc.stdout:
            dpg.configure_item("zt_status_text", label="Уже в сети", enabled=False)
            ip = get_zt_ip(zerotier_id)
            dpg.set_value("zt_status_ip", f"Твой IP: {ip if ip else 'Получение...'}")
            return

        dpg.configure_item("zt_status_text", label="Подключение...", enabled=False)

        join_proc = subprocess.run(
            [cmd, "join", zerotier_id], capture_output=True, text=True, **kwargs
        )

        if join_proc.returncode == 0:
            dpg.configure_item("zt_status_text", label="Подключено", enabled=False)
            for _ in range(5):
                time.sleep(1)
                ip = get_zt_ip(zerotier_id)
                if ip:
                    dpg.set_value("zt_status_ip", f"Твой IP: {ip}")
                    break
            dpg.configure_item("zt_status_text", label="Уже в сети", enabled=False)
        else:
            dpg.configure_item("zt_status_text", label="Ошибка сети", enabled=True)

    except FileNotFoundError:
        if is_retry:
            dpg.configure_item(
                "zt_status_text", label="Перезапустите приложение", enabled=False
            )
            return

        dpg.configure_item("zt_status_text", label="Скачивание ZT...", enabled=False)
        success, message = install_zerotier()

        if success:
            dpg.configure_item("zt_status_text", label="ZT Установлен", enabled=False)
            time.sleep(2)
            connect_to_zt_network(is_retry=True)
        else:
            dpg.configure_item(
                "zt_status_text", label=f"Ошибка: {message}", enabled=True
            )


def action_connect_zt(sender, app_data):
    threading.Thread(target=connect_to_zt_network, daemon=True).start()
