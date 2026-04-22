import os
import requests
import tempfile


def download_file(url: str, filename: str) -> str:
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, filename)

    response = requests.get(url, stream=True, timeout=30)
    response.raise_for_status()

    with open(file_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    return file_path
