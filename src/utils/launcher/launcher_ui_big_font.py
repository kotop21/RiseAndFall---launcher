from typing import Union, Any
import dearpygui.dearpygui as dpg


def set_big_font(item: Union[int, str]):
    from config import res

    font: Any = res.big_font
    if font is not None:
        dpg.bind_item_font(item, font)
