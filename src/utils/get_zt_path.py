import subprocess
import os


def get_zt_path():
    if os.name == "nt":
        paths = [
            "C:\\Program Files (x86)\\ZeroTier\\One\\zerotier-cli.bat",
            "C:\\Program Files\\ZeroTier\\One\\zerotier-cli.exe",
            "zerotier-cli",
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
    return "zerotier-cli"
