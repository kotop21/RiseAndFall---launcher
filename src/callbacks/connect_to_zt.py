import subprocess
import threading
import time
import dearpygui.dearpygui as dpg
from utils.install_zt import install_zerotier
from utils.get_zt_path import get_zt_path


def connect_to_zt_network():
    from config import zerotier_id

    zt_cmd = get_zt_path()

    try:
        # Проверяем список сетей
        check_proc = subprocess.run(
            [zt_cmd, "listnetworks"], capture_output=True, text=True, shell=True
        )

        if zerotier_id in check_proc.stdout:
            # Проверяем, есть ли там статус OK
            if "OK" in check_proc.stdout:
                dpg.set_value("zt_status_text", "Статус: В сети")
            else:
                dpg.set_value("zt_status_text", "Статус: Ожидание конфига...")
            return

        dpg.set_value("zt_status_text", "Статус: Подключение...")

        join_proc = subprocess.run(
            [zt_cmd, "join", zerotier_id], capture_output=True, text=True, shell=True
        )

        if join_proc.returncode == 0:
            dpg.set_value("zt_status_text", "Статус: Подключено")
            time.sleep(2)
            # Рекурсивно проверяем статус еще раз
            connect_to_zt_network()
        else:
            dpg.set_value("zt_status_text", "Статус: Ошибка сети")

    except Exception as e:
        # Если команда не найдена (FileNotFoundError или OSError)
        dpg.set_value("zt_status_text", "Статус: Установка ZT...")

        success, message = install_zerotier()

        if success:
            dpg.set_value("zt_status_text", "Статус: ZT Установлен")
            time.sleep(3)
            connect_to_zt_network()
        else:
            dpg.set_value("zt_status_text", f"Статус: {message}")


def action_connect_zt(sender, app_data):
    threading.Thread(target=connect_to_zt_network, daemon=True).start()
