import dearpygui.dearpygui as dpg
import ipaddress
from ui.ui_modal_base import UiModalBase
from ui.ui_toast import show_toast


class AddPlayerModal(UiModalBase):
    def __init__(self):
        super().__init__("add_player_modal", "Новый игрок")

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

        try:
            dpg.set_frame_callback(
                dpg.get_frame_count() + 2,
                callback=lambda: dpg.focus_item("new_player_name"),
            )
        except Exception:
            pass

    def build_body(self):
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
        )

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
