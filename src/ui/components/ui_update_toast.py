import dearpygui.dearpygui as dpg
from ui.ui_modal_base import UiModalBase


class UpdateModal(UiModalBase):
    def __init__(self):
        super().__init__("update_modal", "Доступно обновление!")
        self.new_version = ""
        self.release_url = ""

    def setup(self):
        from callbacks import (
            action_update_launcher,
            action_remind_later,
            action_skip_update,
        )

        self.buttons = [
            {
                "label": "Обновить",
                "width": 120,
                "callback": action_update_launcher,
                "user_data": self.release_url,
                "color": "green",
            },
            {
                "label": "Не показывать",
                "width": 170,
                "callback": action_skip_update,
                "user_data": self.new_version,
                "color": "blue",
            },
            {
                "label": "Позже",
                "width": 140,
                "callback": action_remind_later,
                "color": "red",
                "new_line": True,
            },
        ]

    def build_body(self):
        dpg.add_text(
            f"Новая версия: {self.new_version}\nРекомендуем обновиться для стабильной игры.",
            wrap=self.width - 20,
        )
        dpg.add_spacer(height=10)


def update_modal_ui(new_version, release_url):
    modal = UpdateModal()
    modal.new_version = new_version
    modal.release_url = release_url
    modal.show()
