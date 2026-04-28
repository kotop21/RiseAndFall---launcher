import dearpygui.dearpygui as dpg
from ui.ui_modal_base import UiModalBase


class NoPathModal(UiModalBase):
    def __init__(self):
        super().__init__("no_path_modal", "Игра не найдена")

    def setup(self):
        self.buttons = [
            {
                "label": "Установить игру",
                "width": 180,
                "callback": self._action_install,
                "color": "green",
            },
            {
                "label": "Выбрать путь",
                "width": 160,
                "callback": self._action_select,
                "color": "blue",
            },
            {
                "label": "Отмена",
                "width": 100,
                "callback": self._action_cancel,
                "color": "red",
                "new_line": True,
            },
        ]

    def build_body(self):
        dpg.add_text(
            "Похоже, путь к игре еще не установлен.",
            wrap=self.width - 20,
        )
        dpg.add_spacer(height=10)

    def _action_install(self, sender, app_data, user_data):
        from callbacks import select_install_dir_native

        dpg.configure_item(self.tag, show=False)
        select_install_dir_native()

    def _action_select(self, sender, app_data, user_data):
        from callbacks import select_game_dir_native

        dpg.configure_item(self.tag, show=False)
        select_game_dir_native()

    def _action_cancel(self, sender, app_data, user_data):
        dpg.configure_item(self.tag, show=False)


def show_no_path_modal():
    NoPathModal().show()
