import threading
import dearpygui.dearpygui as dpg
from utils.addon_installer.manager import InstallManager
from utils.launcher_toast import show_toast


def _run_install_thread(mods_name: str):
    success, message = InstallManager.process_installation(mods_name)

    if success:
        show_toast(f"{mods_name} установлен!", title="Успех")
        print(f"{mods_name} установлен!")
    else:
        show_toast(message, title="Ошибка", color=(255, 0, 0))
        print(f"\nОшибка! {message}")


def action_install_mods(sender, app_data, user_data):
    mods_name = user_data
    show_toast(f"Скачивание {mods_name}...", title="Инфо", color=(255, 255, 0))
    print(f"Скачивание {mods_name}...")
    threading.Thread(target=_run_install_thread, args=[mods_name], daemon=True).start()
