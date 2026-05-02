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


def _get_active_ip_fast():
    proc = run_se_command(["IpConfig"])
    all_ips = re.findall(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", proc.stdout)
    valid_ips = [ip for ip in all_ips if not ip.startswith(("127.", "0.", "169.254"))]
    return valid_ips[-1] if valid_ips else None


def _connect_to_se_network(is_retry=False):
    try:
        dpg.configure_item("vpn_btn", enabled=False)
        dpg.bind_item_theme("vpn_btn", "vpn_theme_loading")

        account_name = "GameNetwork"

        check_proc = run_se_command(["AccountList"])
        if account_name in check_proc.stdout and "Connected" in check_proc.stdout:
            ip = _get_active_ip_fast()
            if ip:
                action_copy_ip(None, None, ip)
                dpg.configure_item("vpn_btn", label="Уже в сети", enabled=True)
                dpg.bind_item_theme("vpn_btn", "vpn_theme_connected")
                return

        nic_check = run_se_command(["NicList"])
        match = re.search(r"(\w+)\s*\|\s*Enabled", nic_check.stdout, re.IGNORECASE)
        if match:
            nic_name = match.group(1)
        else:
            nic_name = "VPN"
            run_se_command(["NicCreate", nic_name])
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

        dpg.configure_item("vpn_btn", label="Получение адреса...", enabled=False)

        final_ip = None
        for _ in range(12):
            time.sleep(2)
            final_ip = _get_active_ip_fast()
            if final_ip:
                break

        if final_ip:
            action_copy_ip(None, None, final_ip)
            dpg.configure_item("vpn_btn", label="Уже в сети", enabled=True)
            dpg.bind_item_theme("vpn_btn", "vpn_theme_connected")
            show_toast(
                "Успешно",
                description=f"Сеть активна: {final_ip}",
                title="Игровая сеть",
                duration=3.0,
            )
        else:
            dpg.configure_item("vpn_btn", label="Проверить IP", enabled=True)
            dpg.bind_item_theme("vpn_btn", "vpn_theme_default")
            show_toast(
                "Внимание",
                description="Авторизация прошла, но адрес задерживается. Нажми еще раз через 5 сек.",
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
