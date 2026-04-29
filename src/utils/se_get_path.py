import os
import platform
import shutil
import subprocess


def get_se_path():
    cmd = shutil.which("vpncmd")
    if cmd:
        return cmd

    system = platform.system()

    if system == "Windows":
        paths = [
            r"C:\Program Files\SoftEther VPN Client Developer Edition\vpncmd.exe",
            r"C:\Program Files (x86)\SoftEther VPN Client Developer Edition\vpncmd.exe",
            r"C:\Program Files\SoftEther VPN Client\vpncmd.exe",
            r"C:\Program Files (x86)\SoftEther VPN Client\vpncmd.exe",
        ]
        for p in paths:
            if (
                os.path.exists(p)
                or subprocess.run(
                    f"where {p}", shell=True, capture_output=True
                ).returncode
                == 0
            ):
                return p

    elif system == "Darwin":
        paths = [
            "/usr/local/bin/vpncmd",
            "/usr/bin/vpncmd",
        ]
        for p in paths:
            if os.path.exists(p):
                return p

    return "vpncmd"
