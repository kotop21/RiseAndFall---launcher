import os
import zipfile
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from config import cfg, PORT
from ui.ui_toast import show_toast


class SaveSyncHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        if self.path == "/test":
            self._send_json(
                200, {"status": "ok", "message": "Сервер работает и порт открыт!"}
            )
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/receive_saves":
            temp_zip = "received_transfer.zip"

            try:
                exe_path = cfg.get("game_dir")
                if not exe_path:
                    self._send_json(
                        400,
                        {"status": "error", "message": "Game path not set on receiver"},
                    )
                    return

                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)

                content_type = self.headers.get("Content-Type", "")
                file_data = b""

                if "multipart/form-data" in content_type:
                    boundary = content_type.split("boundary=")[1].encode("utf-8")
                    parts = body.split(b"--" + boundary)

                    for part in parts:
                        if b"filename=" in part:
                            header_end = part.find(b"\r\n\r\n")
                            if header_end != -1:
                                file_data = part[header_end + 4 : -2]
                                break
                else:
                    file_data = body

                if not file_data:
                    self._send_json(
                        400, {"status": "error", "message": "No file data received"}
                    )
                    return

                game_dir = os.path.dirname(exe_path)
                target_dir = os.path.join(game_dir, "Data", "Saved Games")
                os.makedirs(target_dir, exist_ok=True)

                with open(temp_zip, "wb") as f:
                    f.write(file_data)

                with zipfile.ZipFile(temp_zip, "r") as zip_ref:
                    zip_ref.extractall(target_dir)

                os.remove(temp_zip)

                show_toast("Получены новые сохранения!", title="Синхронизация")

                self._send_json(200, {"status": "success"})

            except Exception as e:
                if os.path.exists(temp_zip):
                    os.remove(temp_zip)
                self._send_json(500, {"status": "error", "message": str(e)})
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


def run_server():
    print("[Server] Запускаем сервер.")
    try:
        server = ThreadingHTTPServer(("0.0.0.0", PORT), SaveSyncHandler)
        print("[Server] Сервер запущен!")
        server.serve_forever()
    except Exception as e:
        with open("CRASH_LOG.txt", "w", encoding="utf-8") as f:
            f.write(f"Ошибка запуска сервера:\n{str(e)}")


if __name__ == "__main__":
    run_server()
