import threading
import requests
import re
from ui.update_modal_render import render_update_modal

GITHUB_REPO = "kotop21/RiseAndFall---launcher"


def _clean_version(v_string):
    match = re.search(r"(\d+\.\d+(?:\.\d+)?)", str(v_string))
    if match:
        ver = match.group(1)
        if ver.count(".") == 1:
            ver += ".0"
        return ver
    return "0.0.0"


def _is_newer_version(latest, current):
    try:
        l_parts = [int(x) for x in latest.split(".")]
        c_parts = [int(x) for x in current.split(".")]
        return l_parts > c_parts
    except Exception as e:
        print(f"[Updater] Ошибка при сравнении версий: {e}")
        return latest != current


def _check_github_logic():
    from config import cfg, project_version

    try:
        print(f"[Updater] Текущая локальная версия: {project_version}")
        url = f"https://api.github.com/repos/{GITHUB_REPO}/releases"
        print(f"[Updater] Стучимся к GitHub: {url}")

        response = requests.get(url, timeout=5)
        print(f"[Updater] Статус ответа GitHub: {response.status_code}")

        if response.status_code == 200:
            releases = response.json()
            if not releases:
                print("[Updater] Релизов в репозитории не найдено.")
                return

            latest_release = releases[0]
            latest_tag = latest_release.get("tag_name", "")
            release_url = latest_release.get("html_url")

            print(f"[Updater] СЫРОЙ ТЕГ С GITHUB: '{latest_tag}'")

            latest_clean = _clean_version(latest_tag)
            current_clean = _clean_version(project_version)
            ignored_version = _clean_version(cfg.get("ignored_version"))

            print(f"[Updater] Версия на GitHub: {latest_clean}")
            print(f"[Updater] Версия в игноре: {ignored_version}")

            if _is_newer_version(latest_clean, current_clean):
                if latest_clean != ignored_version:
                    print("[Updater] Найдена новая версия!")
                    render_update_modal(latest_tag, release_url)
                else:
                    print(
                        "[Updater] Обновление найдено, но пользователь ранее нажал 'Пропустить'."
                    )
            else:
                print("[Updater] Установлена самая актуальная версия.")
        else:
            print(
                f"[Updater] Ошибка API. Возможно, лимит запросов. Ответ: {response.text}"
            )

    except Exception as e:
        print(f"[Updater] Критическая ошибка в фоновом потоке: {e}")


def run_update_checker():
    print("[Updater] Запуск потока проверки обновлений...")
    threading.Thread(target=_check_github_logic, daemon=True).start()
