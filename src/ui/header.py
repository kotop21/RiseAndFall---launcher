import dearpygui.dearpygui as dpg

VIEW_TAGS = ["view_main", "view_mods", "view_settings"]


def switch_view(sender, app_data, user_data):
    target_view = user_data
    for view in VIEW_TAGS:
        btn_tag = f"btn_{view}"
        if view == target_view:
            dpg.show_item(view)
            if dpg.does_alias_exist(btn_tag):
                dpg.bind_item_theme(btn_tag, "active_nav_btn_theme")
        else:
            dpg.hide_item(view)
            if dpg.does_alias_exist(btn_tag):
                dpg.bind_item_theme(btn_tag, 0)


def render_header():
    if not dpg.does_alias_exist("gray_separator_theme"):
        with dpg.theme(tag="gray_separator_theme"):
            with dpg.theme_component(dpg.mvAll):
                dpg.add_theme_color(dpg.mvThemeCol_Separator, (70, 70, 70, 255))

    if not dpg.does_alias_exist("active_nav_btn_theme"):
        with dpg.theme(tag="active_nav_btn_theme"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, (55, 86, 115, 255))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, (70, 100, 130, 255))
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, (45, 75, 100, 255))
                dpg.add_theme_style(dpg.mvStyleVar_FrameRounding, 4)

    with dpg.group(horizontal=True):
        btn_main = dpg.add_button(
            label="> Играть",
            user_data="view_main",
            callback=switch_view,
            tag="btn_view_main",
        )
        dpg.add_button(
            label="* Моды",
            user_data="view_mods",
            callback=switch_view,
            tag="btn_view_mods",
        )
        dpg.add_button(
            label="= Настройки",
            user_data="view_settings",
            callback=switch_view,
            tag="btn_view_settings",
        )

        dpg.bind_item_theme(btn_main, "active_nav_btn_theme")

    sep = dpg.add_separator()
    dpg.bind_item_theme(sep, "gray_separator_theme")
