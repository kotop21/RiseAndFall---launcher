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
from callbacks.launcher_copy_ip import action_copy_ip


def _start_se_install():
    dpg.configure_item(
        "vpn_btn", label="Загрузка сетевых компонентов...", enabled=False
    )
    dpg.bind_item_theme("vpn_btn", "vpn_theme_loading")
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
        dpg.bind_item_theme("vpn_btn", "vpn_theme_default")
        show_toast(
            "Ошибка",
            description="Не удалось загрузить сетевые компоненты",
            title="Настройка сети",
            duration=3.5,
            color=(255, 0, 0),
        )


def _trigger_se_install_thread():
    threading.Thread(target=_start_se_install, daemon=True).start()


def _get_active_ip(account_name):
    status_proc = run_se_command(["AccountStatusGet", account_name])
    ip = None
    for line in status_proc.stdout.splitlines():
        if (
            "Adapter" in line
            or "адаптер" in line
            or "Client IP" in line
            or "клиент" in line.lower()
        ):
            match = re.search(r"(\d{1,3}(?:\.\d{1,3}){3})", line)
            if match:
                ip = match.group(1)
                break

    if not ip:
        all_ips = re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", status_proc.stdout)
        valid_ips = [
            i for i in all_ips if not i.startswith("127.") and not i.startswith("0.")
        ]
        if valid_ips:
            ip = valid_ips[-1]

    return ip


def _connect_to_se_network(is_retry=False):
    try:
        dpg.configure_item("vpn_btn", enabled=False)
        dpg.bind_item_theme("vpn_btn", "vpn_theme_loading")

        account_name = "GameNetwork"

        check_proc = run_se_command(["AccountList"])

        if account_name in check_proc.stdout and "Connected" in check_proc.stdout:
            ip = _get_active_ip(account_name)

            if ip:
                action_copy_ip(None, None, ip)
                dpg.configure_item("vpn_btn", label="Уже в сети", enabled=True)
                dpg.bind_item_theme("vpn_btn", "vpn_theme_connected")
                return
            else:
                run_se_command(["AccountDisconnect", account_name])
                time.sleep(1)

        dpg.configure_item("vpn_btn", label="Инициализация...", enabled=False)

        nic_check = run_se_command(["NicList"])
        nic_name = "GameNet"

        match = re.search(
            r"Adapter Name\s*\|\s*([a-zA-Z0-9_-]+)", nic_check.stdout, re.IGNORECASE
        )
        if match:
            nic_name = match.group(1)
        else:
            run_se_command(["NicCreate", "GameNet"])
            time.sleep(3)
            nic_check = run_se_command(["NicList"])
            match = re.search(
                r"Adapter Name\s*\|\s*([a-zA-Z0-9_-]+)", nic_check.stdout, re.IGNORECASE
            )
            if match:
                nic_name = match.group(1)

        run_se_command(["NicDisable", nic_name])
        time.sleep(2)
        run_se_command(["NicEnable", nic_name])
        time.sleep(2)

        target_host = SE_HOST
        if ":" not in target_host:
            target_host = f"{target_host}:443"

        dpg.configure_item("vpn_btn", label="Маршрутизация...", enabled=False)

        run_se_command(["AccountDelete", account_name])

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

        dpg.configure_item("vpn_btn", label="Синхронизация...", enabled=False)

        run_se_command(["AccountConnect", account_name])

        dpg.configure_item("vpn_btn", label="Получение IP...", enabled=False)

        ip_assigned = False
        final_ip = None
        for _ in range(10):
            time.sleep(1.5)
            final_ip = _get_active_ip(account_name)
            if final_ip:
                ip_assigned = True
                break

        verify_proc = run_se_command(["AccountList"])

        if (
            account_name in verify_proc.stdout
            and "Connected" in verify_proc.stdout
            and ip_assigned
        ):
            if final_ip:
                action_copy_ip(None, None, final_ip)

            dpg.configure_item("vpn_btn", label="Уже в сети", enabled=True)
            dpg.bind_item_theme("vpn_btn", "vpn_theme_connected")
            show_toast(
                "Успешно",
                description="Соединение с игровой сетью установлено",
                title="Сеть",
                duration=2.5,
            )
        else:
            run_se_command(["AccountDisconnect", account_name])
            dpg.configure_item("vpn_btn", label="Сетевая ошибка", enabled=True)
            dpg.bind_item_theme("vpn_btn", "vpn_theme_default")
            show_toast(
                "Сбой подключения",
                description="Адаптер не получил IP-адрес. Попробуйте еще раз.",
                title="Ошибка сети",
                duration=4.0,
                color=(255, 0, 0),
            )

    except FileNotFoundError:
        if is_retry:
            dpg.configure_item("vpn_btn", label="Требуется перезапуск", enabled=False)
            dpg.bind_item_theme("vpn_btn", "vpn_theme_default")
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
            dpg.bind_item_theme("vpn_btn", "vpn_theme_default")
        else:
            _trigger_se_install_thread()


def action_connect_se(sender, app_data):
    threading.Thread(target=_connect_to_se_network, daemon=True).start()
