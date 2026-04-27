import requests
import zipfile
import io

URL = "http://127.0.0.1:9911/receive_saves"
TEST_ZIP = "test_saves.zip"
TEST_FILE_INSIDE = "save_game_001.txt"


def create_mock_zip():
    """Создает временный архив для теста."""
    print(f"[*] Создаем тестовый файл {TEST_FILE_INSIDE}...")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr(TEST_FILE_INSIDE, "This is a fake save file data.")

    zip_buffer.seek(0)
    return zip_buffer


def run_test():
    print(f"[*] Отправка запроса {URL}...")

    zip_data = create_mock_zip()

    try:
        files = {"file": (TEST_ZIP, zip_data, "application/zip")}
        response = requests.post(URL, files=files)

        print(f"[+] Статус код: {response.status_code}")
        print(f"[+] Ответ сервера: {response.json()}")

        if response.status_code == 200:
            print("\n   Успех!\n")
        else:
            print("\nЧто-то пошло не так. Проверь логи сервера.")

    except Exception as e:
        print(f"[!] Ошибка при подключении: {e}")


if __name__ == "__main__":
    run_test()
