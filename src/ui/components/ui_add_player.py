import dearpygui.dearpygui as dpg
import ipaddress
from ui.ui_modal_base import UiModalBase


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

    def build_body(self):
        dpg.add_input_text(
            label="Имя",
            tag="new_player_name",
            hint="Имя",
        )
        dpg.add_input_text(
            label="IP",
            tag="new_player_ip",
            hint="0.0.0.0",
            on_enter=True,
            callback=self._validate_and_save,
        )

    def _validate_and_save(self, sender, app_data, user_data):
        ip = dpg.get_value("new_player_ip")
        try:
            ipaddress.ip_address(ip)
            from callbacks.player_list import action_save_player

            action_save_player(sender, app_data, user_data)
            self.on_close()
        except ValueError:
            from ui.ui_toast import show_toast

            show_toast(
                "Неверный формат IP",
                description="Правильный формат: 0.0.0.0",
                duration=2.5,
                title="Ошибка",
                color=(255, 0, 0),
            )
