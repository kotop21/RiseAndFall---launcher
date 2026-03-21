import os
import platform
import subprocess
import urllib.request
import tempfile


def install_zerotier():
    system = platform.system()
    temp_dir = tempfile.gettempdir()

    if system == "Windows":
        url = "https://download.zerotier.com/dist/ZeroTier%20One.msi"
        installer_path = os.path.join(temp_dir, "zt_setup.msi")
        urllib.request.urlretrieve(url, installer_path)
        subprocess.run(["msiexec", "/i", installer_path, "/passive"], check=True)

    elif system == "Darwin":
        url = "https://download.zerotier.com/dist/ZeroTier%20One.pkg"
        installer_path = os.path.join(temp_dir, "zt_setup.pkg")
        urllib.request.urlretrieve(url, installer_path)
        cmd = f"osascript -e 'do shell script \"installer -pkg {installer_path} -target /\" with administrator privileges'"
        os.system(cmd)

    if os.path.exists(installer_path):
        os.remove(installer_path)
