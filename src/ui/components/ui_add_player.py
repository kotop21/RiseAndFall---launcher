import threading
import dearpygui.dearpygui as dpg
import ipaddress
from ui.ui_modal_base import UiModalBase
from ui.ui_toast import show_toast


class AddPlayerModal(UiModalBase):
    def __init__(self):
        super().__init__("add_player_modal", "Новый игрок")
        self.cached_ips = []

    def setup(self):
        self.buttons = [
            {
                "label": "Сохранить",
                "width": 140,
                "callback": self._validate_and_save,
                "color": "green",
            },
            {
                "label": "Отмена",
                "width": 140,
                "callback": lambda s, a, u: self.on_close(),
                "color": "red",
            },
        ]

    def on_open(self):
        dpg.set_value("new_player_name", "")
        dpg.set_value("new_player_ip", "")
        self.cached_ips = []

        if dpg.does_item_exist("ip_hints_group"):
            dpg.configure_item("ip_hints_group", show=False)
            dpg.delete_item("ip_hints_group", children_only=True)

        try:
            dpg.set_frame_callback(
                dpg.get_frame_count() + 2,
                callback=lambda: dpg.focus_item("new_player_name"),
            )

            def fetch_ips():
                from utils.network_scanner import get_active_ips

                self.cached_ips = get_active_ips()

            threading.Thread(target=fetch_ips, daemon=True).start()
        except Exception:
            pass

    def build_body(self):
        if not dpg.does_item_exist("hint_btn_theme"):
            with dpg.theme(tag="hint_btn_theme"):
                with dpg.theme_component(dpg.mvButton):
                    dpg.add_theme_color(dpg.mvThemeCol_Button, [0, 0, 0, 0])
                    dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, [50, 50, 50, 100])
                    dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, [70, 70, 70, 100])
                    dpg.add_theme_style(dpg.mvStyleVar_ButtonTextAlign, 0.0, 0.5)

        dpg.add_input_text(
            label="Имя",
            tag="new_player_name",
            hint="Имя друга",
            on_enter=True,
            callback=lambda s, a, u: dpg.focus_item("new_player_ip"),
        )
        dpg.add_spacer(height=5)

        dpg.add_input_text(
            label="IP",
            tag="new_player_ip",
            hint="0.0.0.0",
            callback=self._on_ip_typing,
        )

        with dpg.child_window(
            tag="ip_hints_group", show=False, height=80, border=False
        ):
            pass

    def _on_ip_typing(self, sender, app_data, user_data):
        current_text = dpg.get_value("new_player_ip").strip()

        dpg.delete_item("ip_hints_group", children_only=True)

        if not current_text or not self.cached_ips:
            dpg.configure_item("ip_hints_group", show=False)
            return

        matches = [ip for ip in self.cached_ips if current_text in ip]

        if matches:
            calc_height = min(len(matches) * 28 + 10, 85)
            dpg.configure_item("ip_hints_group", show=True, height=calc_height)

            for match in matches:
                btn = dpg.add_button(
                    label=match,
                    width=-1,
                    parent="ip_hints_group",
                    callback=self._select_hint,
                    user_data=match,
                )
                dpg.bind_item_theme(btn, "hint_btn_theme")
        else:
            dpg.configure_item("ip_hints_group", show=False)

    def _select_hint(self, sender, app_data, user_data):
        dpg.set_value("new_player_ip", user_data)
        dpg.configure_item("ip_hints_group", show=False)
        dpg.delete_item("ip_hints_group", children_only=True)

    def _validate_and_save(self, sender, app_data, user_data):
        ip = dpg.get_value("new_player_ip").strip()
        name = dpg.get_value("new_player_name").strip()

        if not name:
            show_toast(
                "Ошибка",
                description="Укажите имя игрока",
                duration=2.0,
                title="Инфо",
                color=(231, 76, 60),
            )
            return

        try:
            ipaddress.ip_address(ip)
            from callbacks.player_list.plist_actions import action_save_player

            action_save_player(name, ip)
            self.on_close()
        except ValueError:
            show_toast(
                "Неверный формат IP",
                description="Пример: 192.168.0.2",
                duration=2.5,
                title="Ошибка",
                color=(231, 76, 60),
            )
