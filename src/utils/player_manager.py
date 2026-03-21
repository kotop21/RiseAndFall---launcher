from config import cfg


def add_player_to_cfg(name: str, ip: str):
    players = cfg.get("custom_players")
    if not isinstance(players, list):
        players = []
    players.append({"name": name, "ip": ip})
    cfg.set("custom_players", players)


def delete_last_player_from_cfg():
    players = cfg.get("custom_players")
    if isinstance(players, list) and len(players) > 0:
        players.pop()
        cfg.set("custom_players", players)
