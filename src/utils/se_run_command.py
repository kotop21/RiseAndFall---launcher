import platform
import subprocess
from typing import Dict, Any

from utils.se_get_path import get_se_path


def run_se_command(args):
    cmd = get_se_path()
    kwargs: Dict[str, Any] = {"capture_output": True, "text": True}

    if platform.system() == "Windows":
        kwargs["creationflags"] = 0x08000000

    return subprocess.run([cmd, "/client", "localhost", "/cmd"] + args, **kwargs)
