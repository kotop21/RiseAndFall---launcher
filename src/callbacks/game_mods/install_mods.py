import threading
from utils.launcher_addon_installer import InstallManager
from ui.ui_toast import show_toast

_prefix = "[Mods]"


def _run_install_thread(mods_name: str):
    success, message = InstallManager.process_installation(mods_name)

    if success:
        show_toast(
            "Установка завершена",
            description=f"Модификация «{mods_name}» успешно добавлена в игру.",
            title="Успех",
            duration=3.0,
        )
        print(f"{_prefix} {mods_name} установлен!")
    else:
        show_toast(
            "Сбой установки",
            description=message,
            title="Ошибка",
            duration=4.0,
            color=(255, 0, 0),
        )
        print(f"{_prefix} Ошибка! {message}")


def action_install_mods(sender, app_data, user_data):
    mods_name = user_data

    show_toast(
        "Начало загрузки...",
        description=f"Скачивание и распаковка файлов для «{mods_name}».",
        title="Менеджер модов",
        duration=2.5,
        color=(26, 82, 118),
    )
    print(f"{_prefix} Скачивание {mods_name}...")

    threading.Thread(target=_run_install_thread, args=[mods_name], daemon=True).start()
