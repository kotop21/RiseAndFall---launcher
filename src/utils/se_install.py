import os
import platform
import subprocess
import tempfile
import requests


def install_softether():
    system = platform.system()
    temp_dir = tempfile.gettempdir()
    installer_path = ""

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        if system == "Windows":
            url = "https://github.com/SoftEtherVPN/SoftEtherVPN_Stable/releases/download/v4.38-9760-rtm/softether-vpnclient-v4.38-9760-rtm-2021.08.17-windows-x86_x64-intel.exe"
            installer_path = os.path.join(temp_dir, "se_setup.exe")

            response = requests.get(url, headers=headers, stream=True)
            response.raise_for_status()
            with open(installer_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            process = subprocess.run(
                [installer_path, "/q"],
                capture_output=True,
                text=True,
            )

            if process.returncode != 0:
                return False, f"Install Error: {process.returncode}"

        elif system == "Darwin":
            return (
                False,
                "Автоматическая установка на Mac не поддерживается.",
            )

        return True, "Success"

    except Exception as e:
        return False, str(e)

    finally:
        if installer_path and os.path.exists(installer_path):
            try:
                os.remove(installer_path)
            except:
                pass
