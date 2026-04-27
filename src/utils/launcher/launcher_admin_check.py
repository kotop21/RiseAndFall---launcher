import ctypes
import sys

_prefix = "[Admin_check] "


# 0 - Admin
# 1 - Not Admin
def admin_check():
    if sys.platform != "win32":
        return 1

    try:
        if ctypes.windll.shell32.IsUserAnAdmin() != 0:
            return 0
        else:
            print(_prefix + "Пользователь запустил не от имени администратора")
            return 1
    except Exception:
        return 1
