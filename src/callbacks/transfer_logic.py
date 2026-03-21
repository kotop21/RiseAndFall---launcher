import dearpygui.dearpygui as dpg
import time
import os
import requests
from config import cfg
from utils.notifications import show_toast
from utils.daily_saves_archive import create_daily_saves_archive

from config import PORT


def start_transfer(player_data):
    zip_file = None
    try:
        player_ip = player_data["ip"]

        if not cfg.get("game_dir"):
            _close_transfer_window()
            show_toast(
                "Выберите .exe игры в настройках!", title="Ошибка", color=(255, 0, 0)
            )
            return

        _update_status("Поиск сохранений за сегодня...")

        archive_name = f"temp_saves_{player_data['name']}.zip"
        zip_file, error = create_daily_saves_archive(cfg.get("game_dir"), archive_name)

        if error or not zip_file:
            _close_transfer_window()
            show_toast(error or "Файлы не найдены", title="Инфо", color=(255, 255, 0))
            return

        if isinstance(zip_file, str) and os.path.exists(zip_file):
            _update_status(f"Отправка на {player_ip}...", 0.5)

            with open(zip_file, "rb") as f:
                url = f"http://{player_ip}:{PORT}/receive_saves"
                response = requests.post(url, files={"file": f}, timeout=30)

            if response.status_code == 200:
                _update_status("Готово!", 1.0)
                time.sleep(0.5)
                show_toast(f"Доставлено {player_data['name']}", title="Успех")
            else:
                show_toast(
                    f"Код: {response.status_code}",
                    title="Ошибка сервера",
                    color=(255, 0, 0),
                )
        else:
            show_toast("Ошибка создания архива", title="Ошибка", color=(255, 0, 0))

    except requests.exceptions.ConnectionError:
        show_toast("Друг не в сети (ZeroTier)", title="Ошибка", color=(255, 0, 0))
    except requests.exceptions.Timeout:
        show_toast("Превышено время ожидания", title="Ошибка", color=(255, 0, 0))
    except Exception as e:
        print(f"Ошибка передачи: {e}")
        show_toast("Критическая ошибка передачи", title="Ошибка", color=(255, 0, 0))

    finally:
        if zip_file and isinstance(zip_file, str) and os.path.exists(zip_file):
            try:
                os.remove(zip_file)
            except:
                pass

        _close_transfer_window()


def _update_status(text, progress=None):
    if dpg.does_item_exist("transfer_status_text"):
        dpg.set_value("transfer_status_text", text)
    if progress is not None and dpg.does_item_exist("transfer_progress"):
        dpg.set_value("transfer_progress", progress)


def _close_transfer_window():
    if dpg.does_item_exist("transfer_window"):
        dpg.delete_item("transfer_window")
