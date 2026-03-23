import os
import platform
import shutil
import subprocess
from typing import Dict, Any


def get_zt_path():
    cmd = shutil.which("zerotier-cli")
    if cmd:
        return cmd

    system = platform.system()

    if system == "Windows":
        paths = [
            r"C:\Program Files (x86)\ZeroTier\One\zerotier-cli.bat",
            r"C:\Program Files\ZeroTier\One\zerotier-cli.exe",
            r"C:\ProgramData\ZeroTier\One\zerotier-cli.bat",
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
            "/usr/local/bin/zerotier-cli",
            "/Library/Application Support/ZeroTier/One/zerotier-cli",
        ]
        for p in paths:
            if os.path.exists(p):
                return p

    return "zerotier-cli"


def run_zt_command(args):
    cmd = get_zt_path()
    kwargs: Dict[str, Any] = {"capture_output": True, "text": True}

    if platform.system() == "Windows":
        kwargs["creationflags"] = 0x08000000

    return subprocess.run([cmd] + args, **kwargs)
