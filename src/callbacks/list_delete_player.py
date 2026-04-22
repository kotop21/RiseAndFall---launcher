from utils.launcher_player_manager import delete_player_from_cfg


def action_delete_player(sender, app_data, user_data):
    from ui.players_list_content import update_players_ui

    player_name = user_data.get("name")
    if player_name:
        delete_player_from_cfg(player_name)
        update_players_ui()
