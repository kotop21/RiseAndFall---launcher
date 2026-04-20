import sys
import subprocess
import dearpygui.dearpygui as dpg
from utils.get_short_path import get_short_path
from utils.notifications import show_toast


def _ask_file_subprocess():
    try:
        if sys.platform == "darwin":
            cmd = """osascript -e 'try' -e 'POSIX path of (choose file with prompt "Выберите исполнительный файл игры")' -e 'end try'"""
            return subprocess.check_output(cmd, shell=True).decode("utf-8").strip()
        elif sys.platform == "win32":
            cmd = """powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Title = 'Выберите исполнительный файл'; $f.Filter = 'Executable (*.exe)|*.exe|All files (*.*)|*.*'; if($f.ShowDialog() -eq 'OK'){ $f.FileName }" """
            return (
                subprocess.check_output(cmd, shell=True)
                .decode("utf-8", errors="ignore")
                .strip()
            )
        return ""
    except Exception:
        return ""


def _ask_dir_subprocess():
    try:
        if sys.platform == "darwin":
            cmd = """osascript -e 'try' -e 'POSIX path of (choose folder with prompt "Выберите папку для установки")' -e 'end try'"""
            return subprocess.check_output(cmd, shell=True).decode("utf-8").strip()
        elif sys.platform == "win32":
            cmd = """powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Выберите папку для установки'; if($f.ShowDialog() -eq 'OK'){ $f.SelectedPath }" """
            return (
                subprocess.check_output(cmd, shell=True)
                .decode("utf-8", errors="ignore")
                .strip()
            )
        return ""
    except Exception:
        return ""


def action_set_game_dir(sender, app_data):
    from config import cfg

    selected_path = app_data["file_path_name"]
    cfg.set("game_dir", selected_path)

    if dpg.does_item_exist("btn_game_dir"):
        dpg.configure_item(
            "btn_game_dir", label=f"Путь: {get_short_path(selected_path)}"
        )


def wrapped_set_game_dir(sender, app_data):
    action_set_game_dir(sender, app_data)
    if dpg.does_alias_exist("no_path_modal"):
        dpg.configure_item("no_path_modal", show=False)
    show_toast("Путь успешно установлен", title="Система")


def select_game_dir_native():
    file_path = _ask_file_subprocess()
    if file_path:
        wrapped_set_game_dir(None, {"file_path_name": file_path})


def select_install_dir_native():
    from callbacks.install_game_action import action_select_install_dir

    dir_path = _ask_dir_subprocess()
    if dir_path:
        action_select_install_dir(None, dir_path)
