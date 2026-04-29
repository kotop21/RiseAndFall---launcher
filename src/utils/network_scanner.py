import platform
import subprocess
import re


def get_active_ips():
    system = platform.system()
    active_ips = set()

    try:
        if system == "Windows":
            proc = subprocess.run(
                ["arp", "-a"], capture_output=True, text=True, creationflags=0x08000000
            )
            for line in proc.stdout.splitlines():
                match = re.search(
                    r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F-]+)\s+dynamic",
                    line,
                )
                if match:
                    ip = match.group(1)
                    if (
                        not ip.startswith("127.")
                        and not ip.startswith("224.")
                        and not ip.startswith("239.")
                        and not ip.endswith(".255")
                    ):
                        active_ips.add(ip)
    except Exception:
        pass

    return list(active_ips)
