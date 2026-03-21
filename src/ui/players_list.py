import dearpygui.dearpygui as dpg
from config import cfg
from callbacks.list_save_player import action_save_player
from callbacks.list_delete_player import action_delete_player
from callbacks.list_send_saves import action_send_saves


def update_players_ui():
    if dpg.does_item_exist("players_list_group"):
        dpg.delete_item("players_list_group", children_only=True)

    players = cfg.get("custom_players")
    if isinstance(players, list):
        for player in players:
            with dpg.group(horizontal=True, parent="players_list_group"):
                p_text = dpg.add_text(player["name"])
                with dpg.popup(p_text, mousebutton=dpg.mvMouseButton_Right):
                    dpg.add_button(
                        label=f"Передать последние сохранения {player['name']}",
                        callback=action_send_saves,
                        user_data=player,
                    )


def render_players_list():
    with dpg.window(
        label="Новый игрок", modal=True, show=False, tag="add_player_modal", width=300
    ):
        dpg.add_input_text(label="Имя", tag="new_player_name")
        dpg.add_input_text(label="IP", tag="new_player_ip")
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
            dpg.add_button(
                label="+",
                callback=lambda: dpg.configure_item("add_player_modal", show=True),
            )
            dpg.add_button(label="-", callback=action_delete_player)
        dpg.add_separator()
        dpg.add_group(tag="players_list_group")
        update_players_ui()
