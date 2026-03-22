import dearpygui.dearpygui as dpg

# Список всех тегов страниц
VIEW_TAGS = ["view_main", "view_utils", "view_mods"]


def switch_view(sender, app_data, user_data):
    target_view = user_data
    for view in VIEW_TAGS:
        if view == target_view:
            dpg.show_item(view)
        else:
            dpg.hide_item(view)


def render_header():
    with dpg.group(horizontal=True):
        dpg.add_button(label="> Играть", user_data="view_main", callback=switch_view)
        dpg.add_button(label="# Утилиты", user_data="view_utils", callback=switch_view)
        dpg.add_button(label="* Моды", user_data="view_mods", callback=switch_view)

    dpg.add_separator()
