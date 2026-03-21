import subprocess
import threading
import time
import dearpygui.dearpygui as dpg
from utils.install_zt import install_zerotier


def connect_to_zt_network():
    from config import zerotier_id

    try:
        check_proc = subprocess.run(
            ["zerotier-cli", "listnetworks"], capture_output=True, text=True
        )

        if zerotier_id in check_proc.stdout:
            dpg.set_value("zt_status_text", "Статус: Уже в сети")
            return

        dpg.set_value("zt_status_text", "Статус: Подключение...")

        join_proc = subprocess.run(
            ["zerotier-cli", "join", zerotier_id], capture_output=True, text=True
        )

        if join_proc.returncode == 0:
            dpg.set_value("zt_status_text", "Статус: Подключено")
            time.sleep(1)
            dpg.set_value("zt_status_text", "Статус: Уже в сети")
        else:
            print(f"ZT Error: {join_proc.stderr}")
            dpg.set_value("zt_status_text", "Статус: Ошибка сети")

    except FileNotFoundError:
        dpg.set_value("zt_status_text", "Статус: Установка ZT...")
        try:
            install_zerotier()
            dpg.set_value("zt_status_text", "Статус: ZT Установлен")
            time.sleep(1)
            connect_to_zt_network()
        except Exception as e:
            print(f"Install error: {e}")
            dpg.set_value("zt_status_text", "Статус: Ошибка установки")


def action_connect_zt(sender, app_data):
    threading.Thread(target=connect_to_zt_network, daemon=True).start()
