import sys
import dearpygui.dearpygui as dpg


def admin_warning_ui(on_ignore=None):
    if dpg.does_item_exist("admin_warning_modal"):
        dpg.delete_item("admin_warning_modal")

    vw = dpg.get_viewport_client_width()
    vh = dpg.get_viewport_client_height()

    with dpg.window(
        label="Требуются права администратора",
        modal=True,
        show=True,
        tag="admin_warning_modal",
        no_resize=True,
        no_move=True,
        no_collapse=True,
        pos=[(vw - 420) // 2, (vh - 190) // 2],
        width=425,
    ):
        dpg.add_text(
            "Запуск без прав администратора может привести к ошибкам записи файлов. Рекомендуется перезапустить лаунчер с полными правами.",
            wrap=420,
        )
        dpg.add_spacer(height=15)

        with dpg.group(horizontal=True):
            dpg.add_button(
                label="Закрыть",
                width=200,
                callback=_action_close_launcher,
            )
            dpg.add_button(
                label="Отменить",
                width=200,
                callback=_action_ignore_warning,
                user_data=on_ignore,
            )


def _action_close_launcher(sender, app_data, user_data):
    dpg.stop_dearpygui()

    if sys.platform == "darwin":
        dpg.destroy_context()

    sys.exit(0)


def _action_ignore_warning(sender, app_data, user_data):
    if dpg.does_item_exist("admin_warning_modal"):
        dpg.delete_item("admin_warning_modal")

    if user_data:
        user_data()
