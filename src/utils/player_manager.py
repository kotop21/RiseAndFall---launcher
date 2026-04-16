def add_player_to_cfg(name: str, ip: str):
    from config import cfg

    players = cfg.get("custom_players")
    if not isinstance(players, list):
        players = []
    players.append({"name": name, "ip": ip})
    cfg.set("custom_players", players)


def delete_player_from_cfg(name: str):
    from config import cfg

    players = cfg.get("custom_players")
    if isinstance(players, list):
        players = [p for p in players if p.get("name") != name]
        cfg.set("custom_players", players)
