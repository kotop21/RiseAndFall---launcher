import dearpygui.dearpygui as dpg
from ui.ui_modal_base import UiModalBase


class AdminWarningModal(UiModalBase):
    def __init__(self):
        super().__init__("admin_warning_modal", "Требуются права администратора")
        self.on_ignore = None

    def setup(self):
        self.buttons = [
            {
                "label": "Закрыть",
                "width": 200,
                "callback": _action_close_launcher,
                "color": "green",
            },
            {
                "label": "Отменить",
                "width": 200,
                "callback": _action_ignore_warning,
                "user_data": self.on_ignore,
                "color": "red",
            },
        ]

    def build_body(self):
        dpg.add_text(
            "Запуск без прав администратора может привести к ошибкам. Рекомендуется перезапустить лаунчер с полными правами.",
            wrap=self.width - 20,
        )
        dpg.add_spacer(height=10)


def admin_warning_ui(on_ignore=None):
    modal = AdminWarningModal()
    modal.on_ignore = on_ignore
    modal.show()


def _action_close_launcher(sender, app_data, user_data):
    dpg.stop_dearpygui()


def _action_ignore_warning(sender, app_data, user_data):
    if dpg.does_item_exist("admin_warning_modal"):
        dpg.delete_item("admin_warning_modal")

    if user_data:
        user_data()
