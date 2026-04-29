import threading
import time
import dearpygui.dearpygui as dpg

from utils import run_se_command
from utils import install_softether
from utils.launcher import admin_check
from config import SE_HOST, SE_HUB, SE_USER, SE_PASS
from ui.components import admin_warning_ui
from ui.ui_toast import show_toast


def _start_se_install():
    dpg.configure_item(
        "vpn_btn", label="Загрузка сетевых компонентов...", enabled=False
    )
    success, message = install_softether()

    if success:
        dpg.configure_item("vpn_btn", label="Компоненты установлены", enabled=False)
        show_toast(
            "Готово",
            description="Сетевые компоненты успешно установлены",
            title="Игровая сеть",
            duration=2.5,
        )
        time.sleep(2)
        _connect_to_se_network(is_retry=True)
    else:
        dpg.configure_item("vpn_btn", label="Ошибка установки", enabled=True)
        show_toast(
            "Ошибка",
            description=message,
            title="Настройка сети",
            duration=3.5,
            color=(255, 0, 0),
        )


def _trigger_se_install_thread():
    threading.Thread(target=_start_se_install, daemon=True).start()


def _connect_to_se_network(is_retry=False):
    try:
        dpg.configure_item("vpn_btn", enabled=False)

        account_name = "GameNetwork"
        nic_name = "GameNet"

        check_proc = run_se_command(["AccountList"])

        if account_name in check_proc.stdout and "Connected" in check_proc.stdout:
            dpg.configure_item("vpn_btn", label="Уже в сети", enabled=False)
            show_toast(
                "Статус",
                description="Вы уже подключены к игровой сети",
                title="Сеть",
                duration=2.0,
            )
            return

        dpg.configure_item("vpn_btn", label="Подключение...", enabled=False)

        run_se_command(["NicCreate", nic_name])
        run_se_command(
            [
                "AccountCreate",
                account_name,
                f"/SERVER:{SE_HOST}",
                f"/HUB:{SE_HUB}",
                f"/USERNAME:{SE_USER}",
                f"/NICNAME:{nic_name}",
            ]
        )
        run_se_command(
            [
                "AccountPasswordSet",
                account_name,
                f"/PASSWORD:{SE_PASS}",
                "/TYPE:standard",
            ]
        )

        join_proc = run_se_command(["AccountConnect", account_name])

        if join_proc.returncode == 0:
            dpg.configure_item("vpn_btn", label="Подключено", enabled=False)
            show_toast(
                "Успешно",
                description="Соединение с игровой сетью установлено",
                title="Сеть",
                duration=2.5,
            )
        else:
            dpg.configure_item("vpn_btn", label="Ошибка сети", enabled=True)
            show_toast(
                "Ошибка",
                description="Не удалось подключиться к серверу сети",
                title="Сеть",
                duration=3.0,
                color=(255, 0, 0),
            )

    except FileNotFoundError:
        if is_retry:
            dpg.configure_item(
                "vpn_btn", label="Перезапустите приложение", enabled=False
            )
            show_toast(
                "Ошибка",
                description="Что-то пошло не так. Перезапустите лаунчер.",
                title="Сеть",
                duration=3.0,
                color=(255, 0, 0),
            )
            return

        if admin_check() == 1:
            admin_warning_ui()
            dpg.configure_item("vpn_btn", label="Недостаточно прав", enabled=True)
        else:
            _trigger_se_install_thread()


def action_connect_se(sender, app_data):
    threading.Thread(target=_connect_to_se_network, daemon=True).start()
