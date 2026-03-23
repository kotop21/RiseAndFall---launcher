from utils.player_manager import delete_last_player_from_cfg


def action_delete_player():
    from ui.players_list_render import update_players_ui

    delete_last_player_from_cfg()
    update_players_ui()
