import dearpygui.dearpygui as dpg
import threading


def action_send_saves(sender, app_data, user_data):
    from callbacks import action_start_transfer

    if dpg.does_item_exist("transfer_window"):
        return

    with dpg.window(
        label="Синхронизация",
        tag="transfer_window",
        width=400,
        height=180,
        no_resize=True,
        modal=True,
        pos=[250, 150],
    ):
        dpg.add_text(f"Получатель: {user_data['name']}")
        dpg.add_text(f"IP: {user_data['ip']}")
        dpg.add_spacer(height=5)

        dpg.add_text("Инициализация...", tag="transfer_status_text")
        dpg.add_progress_bar(tag="transfer_progress", width=-1, default_value=0.0)

        dpg.add_spacer(height=10)
        dpg.add_button(
            label="Отмена",
            width=100,
            callback=lambda: dpg.delete_item("transfer_window"),
        )

    # Запускаем вынесенную логику в потоке
    threading.Thread(
        target=action_start_transfer, args=(user_data,), daemon=True
    ).start()
