import uvicorn
from fastapi import FastAPI, UploadFile, File
import shutil
import os
import zipfile
import asyncio
from config import cfg
from utils.notifications import show_toast
from config import PORT

app = FastAPI()


@app.get("/test")
async def test_connection():
    return {"status": "ok", "message": "Сервер работает и порт открыт!"}


@app.post("/receive_saves")
async def receive_saves(file: UploadFile = File(...)):
    exe_path = cfg.get("game_dir")
    if not exe_path:
        return {"status": "error", "message": "Game path not set on receiver"}

    game_dir = os.path.dirname(exe_path)
    target_dir = os.path.join(game_dir, "Data", "Saved Games")
    os.makedirs(target_dir, exist_ok=True)

    temp_zip = "received_transfer.zip"

    try:
        with open(temp_zip, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with zipfile.ZipFile(temp_zip, "r") as zip_ref:
            zip_ref.extractall(target_dir)

        os.remove(temp_zip)

        show_toast("Получены новые сохранения!", title="Синхронизация")
        return {"status": "success"}

    except Exception as e:
        if os.path.exists(temp_zip):
            os.remove(temp_zip)
        return {"status": "error", "message": str(e)}


def run_server():
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        config = uvicorn.Config(app, host="0.0.0.0", port=PORT, log_config=None)
        server = uvicorn.Server(config)

        loop.run_until_complete(server.serve())
    except Exception as e:
        with open("CRASH_LOG.txt", "w", encoding="utf-8") as f:
            f.write(f"Ошибка запуска сервера:\n{str(e)}")
