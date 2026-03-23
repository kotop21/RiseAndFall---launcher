import dearpygui.dearpygui as dpg

from utils.notifications import show_toast
from callbacks.list_save_player import action_save_player
from callbacks.list_delete_player import action_delete_player
from callbacks.list_send_saves import action_send_saves


def _copy_ip_to_clipboard(sender, app_data, user_data):
    player_ip = user_data.get("ip", "")
    if player_ip:
        dpg.set_clipboard_text(player_ip)
        show_toast(f"IP скопирован", title="Буфер обмена", duration=1.5)


def update_players_ui():
    from config import cfg

    if dpg.does_item_exist("players_list_group"):
        dpg.delete_item("players_list_group", children_only=True)

    if not dpg.does_item_exist("player_btn_theme"):
        with dpg.theme(tag="player_btn_theme"):
            with dpg.theme_component(dpg.mvButton):
                dpg.add_theme_color(dpg.mvThemeCol_Button, [0, 0, 0, 0])
                dpg.add_theme_color(dpg.mvThemeCol_ButtonHovered, [255, 255, 255, 30])
                dpg.add_theme_color(dpg.mvThemeCol_ButtonActive, [255, 255, 255, 60])
                dpg.add_theme_style(dpg.mvStyleVar_ButtonTextAlign, 0.0, 0.5)

    if not dpg.does_item_exist("popup_compact_theme"):
        with dpg.theme(tag="popup_compact_theme"):
            with dpg.theme_component(dpg.mvAll):
                dpg.add_theme_style(dpg.mvStyleVar_WindowPadding, 4.0, 4.0)

    players = cfg.get("custom_players")
    if isinstance(players, list):
        for player in players:
            btn = dpg.add_button(
                label=player["name"],
                width=-1,
                callback=_copy_ip_to_clipboard,
                user_data=player,
                parent="players_list_group",
            )
            dpg.bind_item_theme(btn, "player_btn_theme")

            with dpg.popup(btn, mousebutton=dpg.mvMouseButton_Right) as popup_id:
                dpg.bind_item_theme(popup_id, "popup_compact_theme")
                dpg.add_button(
                    label=f"Передать последние сохранения {player['name']}",
                    callback=action_send_saves,
                    user_data=player,
                )


def open_add_player_modal():
    vw = dpg.get_viewport_client_width()
    vh = dpg.get_viewport_client_height()

    dpg.configure_item(
        "add_player_modal", show=True, pos=[(vw - 300) // 2, (vh - 120) // 2]
    )


def render_players_list():
    with dpg.window(
        label="Новый игрок",
        modal=True,
        show=False,
        tag="add_player_modal",
        width=300,
        no_resize=True,
    ):
        dpg.add_input_text(label="Имя", tag="new_player_name")
        dpg.add_input_text(label="IP", tag="new_player_ip")
        dpg.add_spacer(height=5)
        with dpg.group(horizontal=True):
            dpg.add_button(label="Сохранить", callback=action_save_player, width=140)
            dpg.add_button(
                label="Отмена",
                callback=lambda: dpg.configure_item("add_player_modal", show=False),
                width=140,
            )

    with dpg.child_window(width=200, border=True, tag="players_container"):
        with dpg.group(horizontal=True):
            dpg.add_text("Друзья")
            dpg.add_button(label="+", callback=open_add_player_modal)
            dpg.add_button(label="-", callback=action_delete_player)
        dpg.add_separator()
        dpg.add_group(tag="players_list_group")
        update_players_ui()
