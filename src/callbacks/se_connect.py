import threading
import time
import re
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
    dpg.bind_item_theme("vpn_btn", "vpn_theme_loading")
    success, message = install_softether()
    if success:
        show_toast(
            "Готово",
            description="Компоненты установлены",
            title="Игровая сеть",
            duration=2.5,
        )
        time.sleep(2)
        _connect_to_se_network(is_retry=True)
    else:
        dpg.configure_item("vpn_btn", label="Ошибка установки", enabled=True)
        dpg.bind_item_theme("vpn_btn", "vpn_theme_default")
        show_toast(
            "Ошибка",
            description="Не удалось загрузить компоненты",
            title="Игровая сеть",
            duration=3.5,
            color=(255, 0, 0),
        )


def _connect_to_se_network(is_retry=False):
    try:
        dpg.configure_item("vpn_btn", enabled=False)
        dpg.bind_item_theme("vpn_btn", "vpn_theme_loading")

        account_name = "GameNetwork"

        run_se_command(["AccountDisconnect", account_name])
        time.sleep(1)

        nic_check = run_se_command(["NicList"])
        match = re.search(
            r"Adapter Name\s*\|\s*([a-zA-Z0-9_-]+)", nic_check.stdout, re.IGNORECASE
        )

        if match:
            nic_name = match.group(1)
        else:
            nic_name = "VPN"
            run_se_command(["NicCreate", nic_name])
            time.sleep(2)

        dpg.configure_item("vpn_btn", label="Перезапуск адаптера...", enabled=False)
        run_se_command(["NicDisable", nic_name])
        time.sleep(2)
        run_se_command(["NicEnable", nic_name])
        time.sleep(2)

        dpg.configure_item("vpn_btn", label="Настройка сети...", enabled=False)
        run_se_command(["AccountDelete", account_name])

        target_host = SE_HOST if ":" in SE_HOST else f"{SE_HOST}:443"

        run_se_command(
            [
                "AccountCreate",
                account_name,
                f"/SERVER:{target_host}",
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

        dpg.configure_item("vpn_btn", label="Подключение...", enabled=False)
        run_se_command(["AccountConnect", account_name])

        dpg.configure_item("vpn_btn", label="Авторизация...", enabled=False)
        time.sleep(6)

        verify_proc = run_se_command(["AccountList"])

        if account_name in verify_proc.stdout and "Connected" in verify_proc.stdout:
            dpg.configure_item("vpn_btn", label="Уже в сети", enabled=False)
            dpg.bind_item_theme("vpn_btn", "vpn_theme_connected")
            show_toast(
                "Успешно",
                description="Соединение с игровой сетью установлено",
                title="Игровая сеть",
                duration=3.0,
            )
        else:
            dpg.configure_item("vpn_btn", label="Проверить соединение", enabled=True)
            dpg.bind_item_theme("vpn_btn", "vpn_theme_default")
            show_toast(
                "Внимание",
                description="Авторизация задерживается. Нажмите еще раз через пару секунд.",
                title="Ожидание сети",
                duration=5.0,
            )

    except FileNotFoundError:
        if is_retry:
            dpg.configure_item("vpn_btn", label="Ошибка запуска", enabled=False)
            return
        if admin_check() == 1:
            admin_warning_ui()
        else:
            threading.Thread(target=_start_se_install, daemon=True).start()


def action_connect_se(sender, app_data):
    threading.Thread(target=_connect_to_se_network, daemon=True).start()
