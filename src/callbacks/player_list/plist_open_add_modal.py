import dearpygui.dearpygui as dpg


def open_add_player_modal():
    vw = dpg.get_viewport_client_width()
    vh = dpg.get_viewport_client_height()

    dpg.configure_item(
        "add_player_modal", show=True, pos=[(vw - 300) // 2, (vh - 120) // 2]
    )
