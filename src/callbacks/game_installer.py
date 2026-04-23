import threading
import urllib.request
import zipfile
import os
import dearpygui.dearpygui as dpg
from utils import get_short_path

GAME_ARCHIVE_URL = "http://raf-api.duckdns.org:25566/api/public/dl/igh79Xlx"
GAME_EXE_NAME = "RiseAndFall.exe"


def action_save_launch_args(sender, app_data):
    from config import cfg

    cfg.set("launch_args", app_data)


def action_select_install_dir(sender, app_data):
    install_dir = app_data["file_path_name"]
    if dpg.does_item_exist("install_modal"):
        dpg.delete_item("install_modal")
    with dpg.window(
        label="Установка",
        tag="install_modal",
        modal=True,
        show=True,
        width=400,
        height=170,
        no_close=True,
    ):
        dpg.add_text("Скачивание...", tag="install_status")
        dpg.add_progress_bar(tag="install_progress", width=-1, default_value=0.0)
    threading.Thread(
        target=_download_and_extract, args=(install_dir,), daemon=True
    ).start()


def _download_and_extract(install_dir):
    from config import cfg

    zip_path = os.path.join(install_dir, "game.zip")

    def report(block_num, block_size, total_size):
        if total_size > 0:
            percent = min((block_num * block_size) / total_size, 1.0)
            dpg.set_value("install_progress", percent)

    try:
        urllib.request.urlretrieve(GAME_ARCHIVE_URL, zip_path, reporthook=report)
        dpg.set_value("install_status", "Распаковка файлов...")
        dpg.set_value("install_progress", 0.0)
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(install_dir)
        os.remove(zip_path)
        exe_path = os.path.join(install_dir, GAME_EXE_NAME)
        cfg.set("game_dir", exe_path)
        if dpg.does_item_exist("btn_game_dir"):
            dpg.configure_item(
                "btn_game_dir", label=f"Путь: {get_short_path(exe_path)}"
            )
        dpg.set_value("install_status", "Установка успешно завершена!")
        dpg.set_value("install_progress", 1.0)
    except Exception as e:
        dpg.set_value("install_status", f"Ошибка: {e}")
    finally:
        dpg.add_spacer(parent="install_modal", height=10)
        dpg.add_button(
            label="Закрыть",
            callback=lambda: dpg.delete_item("install_modal"),
            parent="install_modal",
            width=-1,
        )
