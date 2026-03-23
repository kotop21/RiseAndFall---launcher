import os
import platform
import subprocess
import tempfile
import ctypes
import requests


def is_admin():
    try:
        if platform.system() == "Windows":
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        else:
            return os.getuid() == 0
    except:
        return False


def install_zerotier():
    system = platform.system()
    temp_dir = tempfile.gettempdir()
    installer_path = ""

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        if system == "Windows":
            if not is_admin():
                return False, "Access Denied: Run as Admin"

            url = "https://download.zerotier.com/dist/ZeroTier%20One.msi"
            installer_path = os.path.join(temp_dir, "zt_setup.msi")

            response = requests.get(url, headers=headers, stream=True)
            response.raise_for_status()
            with open(installer_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            process = subprocess.run(
                ["msiexec", "/i", installer_path, "/passive", "/norestart"],
                capture_output=True,
                text=True,
            )

            if process.returncode != 0:
                return False, f"MSI Error: {process.returncode}"

        elif system == "Darwin":
            url = "https://download.zerotier.com/dist/ZeroTier%20One.pkg"
            installer_path = os.path.join(temp_dir, "zt_setup.pkg")

            response = requests.get(url, headers=headers)
            response.raise_for_status()
            with open(installer_path, "wb") as f:
                f.write(response.content)

            cmd = f"osascript -e 'do shell script \"installer -pkg {installer_path} -target /\" with administrator privileges'"
            exit_code = os.system(cmd)

            if exit_code != 0:
                return False, "Installation failed or cancelled"

        return True, "Success"

    except Exception as e:
        return False, str(e)

    finally:
        if installer_path and os.path.exists(installer_path):
            try:
                os.remove(installer_path)
            except:
                pass
