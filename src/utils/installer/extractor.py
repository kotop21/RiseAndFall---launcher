import os
import zipfile


def extract_and_cleanup(
    archive_path: str, target_dir: str, ignore_list: list[str] = None
) -> None:
    os.makedirs(target_dir, exist_ok=True)

    if ignore_list is None:
        ignore_list = []

    with zipfile.ZipFile(archive_path, "r") as zip_ref:
        for member in zip_ref.namelist():
            skip = False
            for ignore_item in ignore_list:
                if member == ignore_item or member.startswith(
                    ignore_item.rstrip("/") + "/"
                ):
                    skip = True
                    break

            if not skip:
                zip_ref.extract(member, target_dir)

    if os.path.exists(archive_path):
        os.remove(archive_path)
