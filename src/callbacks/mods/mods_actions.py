import threading
import dearpygui.dearpygui as dpg
from utils.installer.manager import InstallManager
from utils.notifications import show_toast


def _run_install_thread(mods_name: str):
    success, message = InstallManager.process_installation(mods_name)

    if success:
        show_toast(f"{mods_name} установлен!", title="Успех")
    else:
        show_toast(message, title="Ошибка", color=(255, 0, 0))


def action_install_mods(sender, app_data, user_data):
    mods_name = user_data
    show_toast(f"Скачивание {mods_name}...", title="Инфо", color=(255, 255, 0))
    threading.Thread(target=_run_install_thread, args=[mods_name], daemon=True).start()
