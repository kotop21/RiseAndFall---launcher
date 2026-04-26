import dearpygui.dearpygui as dpg
from callbacks import (
    action_update_launcher,
    action_remind_later,
    action_skip_update,
)


def render_update_modal(new_version, release_url):
    if dpg.does_item_exist("update_modal"):
        dpg.delete_item("update_modal")

    vw = dpg.get_viewport_client_width()
    vh = dpg.get_viewport_client_height()

    with dpg.window(
        label="Доступно обновление!",
        modal=True,
        show=True,
        tag="update_modal",
        no_resize=True,
        no_move=True,
        no_collapse=True,
        pos=[(vw - 430) // 2, (vh - 190) // 2],
        width=460,
    ):
        dpg.add_text(
            f"Найдена новая версия: {new_version}\nРекомендуем обновиться для стабильной игры.",
            wrap=400,
        )
        dpg.add_spacer(height=15)

        with dpg.group(horizontal=True):
            dpg.add_button(
                label="Обновить",
                width=120,
                callback=action_update_launcher,
                user_data=release_url,
            )
            dpg.add_button(label="Позже", width=140, callback=action_remind_later)
            dpg.add_button(
                label="Не показывать",
                width=170,
                callback=action_skip_update,
                user_data=new_version,
            )
