import dearpygui.dearpygui as dpg


class UiModalBase:
    def __init__(self, tag, title):
        self.tag = tag
        self.title = title
        self.buttons = []
        self.width = 0

    def setup(self):
        pass

    def build_body(self):
        pass

    def on_open(self):
        pass

    def on_close(self):
        if dpg.does_item_exist(self.tag):
            dpg.configure_item(self.tag, show=False)

    def _escape_handler(self, sender, app_data, user_data):
        if dpg.does_item_exist(self.tag) and dpg.is_item_shown(self.tag):
            self.on_close()

    def show(self, is_shown=True):
        self.buttons.clear()
        self.setup()

        if dpg.does_item_exist(self.tag):
            dpg.delete_item(self.tag)

        try:
            vw = dpg.get_viewport_client_width()
            vh = dpg.get_viewport_client_height()
            max_width = min(600, vw - 40)
        except Exception:
            vw = 850
            vh = 550
            max_width = 600

        if not hasattr(self, "_original_width"):
            self._original_width = self.width

        total_btn_width = sum(
            btn.get("width", 100) for btn in self.buttons if not btn.get("new_line")
        )
        spacing_total = (
            max(0, len([b for b in self.buttons if not b.get("new_line")]) - 1) * 8
        )
        calculated_width = total_btn_width + spacing_total + 30

        if self._original_width <= 0:
            self.width = min(max_width, max(calculated_width, 305))
        else:
            self.width = self._original_width

        pos = [(vw - self.width) // 2, (vh - 250) // 2]

        available_width = self.width - 16
        spacing = 8
        rows = []
        current_row = []
        current_min_width = 0

        for btn in self.buttons:
            btn_min = len(btn.get("label", "")) * 8 + 30
            btn["_min"] = btn_min

            if btn.get("new_line", False):
                if current_row:
                    rows.append(current_row)
                    current_row = []
                    current_min_width = 0
                rows.append([btn])
            else:
                if current_row and (
                    current_min_width + spacing + btn_min > available_width
                ):
                    rows.append(current_row)
                    current_row = [btn]
                    current_min_width = btn_min
                else:
                    current_row.append(btn)
                    current_min_width += (
                        btn_min if not current_row else spacing + btn_min
                    )

        if current_row:
            rows.append(current_row)

        with dpg.window(
            label=self.title,
            modal=True,
            show=is_shown,
            tag=self.tag,
            no_resize=True,
            no_move=True,
            no_collapse=True,
            no_close=True,
            pos=pos,
            width=self.width,
        ):
            self.build_body()

            if self.buttons:
                dpg.add_spacer(height=5)
                for row in rows:
                    total_min = sum(b["_min"] for b in row)
                    total_spacing = (len(row) - 1) * spacing
                    space_to_fill = available_width - total_spacing

                    with dpg.group(horizontal=True):
                        for b in row:
                            proportion = (
                                b["_min"] / total_min if total_min > 0 else 1 / len(row)
                            )
                            actual_width = int(space_to_fill * proportion)

                            btn_id = dpg.add_button(
                                label=b.get("label", ""),
                                width=actual_width,
                                callback=b.get("callback"),
                                user_data=b.get("user_data"),
                            )

                            with dpg.theme() as btn_theme:
                                with dpg.theme_component(dpg.mvButton):
                                    color = b.get("color")
                                    if color == "green":
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_Button, (25, 111, 61)
                                        )
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_ButtonHovered, (30, 132, 73)
                                        )
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_ButtonActive, (20, 89, 49)
                                        )
                                    elif color == "blue":
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_Button, (26, 82, 118)
                                        )
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_ButtonHovered, (31, 97, 141)
                                        )
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_ButtonActive, (21, 67, 96)
                                        )
                                    elif color == "red":
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_Button, (120, 40, 31)
                                        )
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_ButtonHovered, (148, 49, 38)
                                        )
                                        dpg.add_theme_color(
                                            dpg.mvThemeCol_ButtonActive, (90, 30, 23)
                                        )

                                    dpg.add_theme_style(dpg.mvStyleVar_FrameRounding, 4)

                            dpg.bind_item_theme(btn_id, btn_theme)

        handler_tag = f"{self.tag}_esc_handler"
        if not dpg.does_alias_exist(handler_tag):
            with dpg.handler_registry(tag=handler_tag):
                dpg.add_key_press_handler(
                    dpg.mvKey_Escape, callback=self._escape_handler
                )

        if is_shown:
            self.on_open()
