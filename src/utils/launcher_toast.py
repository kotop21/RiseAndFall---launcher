import dearpygui.dearpygui as dpg
import threading

_current_toast_tag = None
_current_timer = None


def show_toast(message, title="Уведомление", duration=1.5, color=(0, 255, 0)):
    global _current_toast_tag, _current_timer
    from config import res

    if _current_toast_tag and dpg.does_item_exist(_current_toast_tag):
        dpg.delete_item(_current_toast_tag)

    if _current_timer:
        _current_timer.cancel()

    tag = f"toast_{dpg.generate_uuid()}"
    _current_toast_tag = tag

    vp_width = dpg.get_viewport_client_width()
    vp_height = dpg.get_viewport_client_height()

    vp_width = vp_width if vp_width > 0 else 850
    vp_height = vp_height if vp_height > 0 else 550

    pos_x = vp_width - 830
    pos_y = vp_height - 120

    with dpg.window(
        no_title_bar=True,
        autosize=True,
        no_move=True,
        no_resize=True,
        no_background=False,
        no_scrollbar=True,
        no_saved_settings=True,
        pos=[pos_x, pos_y],
        tag=tag,
    ):
        if res.big_font:
            dpg.bind_item_font(tag, res.big_font)

        with dpg.group(horizontal=True):
            dpg.add_text("V", color=color)
            dpg.add_text(f"{title}: {message}")
            dpg.add_spacer(width=5)
            # dpg.add_button(label="X", callback=lambda: _close_toast(tag), small=True)

    def _close_toast(t_tag):
        if dpg.does_item_exist(t_tag):
            dpg.delete_item(t_tag)

    _current_timer = threading.Timer(duration, _close_toast, args=[tag])
    _current_timer.start()
