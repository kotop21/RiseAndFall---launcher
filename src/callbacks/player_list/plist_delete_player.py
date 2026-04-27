def action_delete_player(sender, app_data, user_data):
    from utils.launcher import delete_player_from_cfg
    from ui.ui_player_list import update_players_ui

    player_name = user_data.get("name")
    if player_name:
        delete_player_from_cfg(player_name)
        update_players_ui()
