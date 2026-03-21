import dearpygui.dearpygui as dpg

TEST_PLAYERS = [
    {"name": "Admin_Dmitry", "online": True},
    {"name": "Alex_Nagibator", "online": True},
    {"name": "Misha_99", "online": False},
    {"name": "Serega_PRO", "online": True},
    {"name": "Gamer_X", "online": False},
]


def render_players_list():
    with dpg.child_window(width=200, border=True):
        for player in TEST_PLAYERS:
            with dpg.group(horizontal=True):
                icon_color = (0, 255, 0) if player["online"] else (255, 0, 0)
                dpg.add_text("●", color=icon_color)
                dpg.add_text(player["name"])
