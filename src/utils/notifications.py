import dearpygui.dearpygui as dpg
import threading


def show_toast(message, title="Уведомление", duration=3.0, color=(0, 255, 0)):
    from config import res

    tag = f"toast_{dpg.generate_uuid()}"

    with dpg.window(
        no_title_bar=True,
        autosize=True,
        no_move=True,
        no_resize=True,
        no_background=False,
        pos=[20, 20],
        tag=tag,
    ):
        if res.big_font:
            dpg.bind_item_font(tag, res.big_font)

        with dpg.group(horizontal=True):
            dpg.add_text("V", color=color)
            dpg.add_text(f"{title}: {message}")

            dpg.add_spacer(width=10)
            dpg.add_button(label="X", callback=lambda: dpg.delete_item(tag), small=True)

    def destroy():
        if dpg.does_item_exist(tag):
            dpg.delete_item(tag)

    threading.Timer(duration, destroy).start()
