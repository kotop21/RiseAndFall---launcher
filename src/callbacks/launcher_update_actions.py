import webbrowser
import dearpygui.dearpygui as dpg


def action_update_launcher(sender, app_data, user_data):
    release_url = user_data
    webbrowser.open(release_url)
    dpg.configure_item("update_modal", show=False)


def action_remind_later(sender, app_data, user_data):
    dpg.configure_item("update_modal", show=False)


def action_skip_update(sender, app_data, user_data):
    from config import cfg

    new_version = user_data
    cfg.set("ignored_version", new_version)
    dpg.configure_item("update_modal", show=False)
