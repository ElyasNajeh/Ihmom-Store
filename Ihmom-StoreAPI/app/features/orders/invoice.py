from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal
from html import escape
from io import BytesIO
from pathlib import Path
from typing import TYPE_CHECKING

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.constants.common import CURRENCY_SYMBOL
from app.constants.invoice import (
    INVOICE_DEFAULT_LANGUAGE,
    INVOICE_LABELS,
    INVOICE_MONTHS,
    INVOICE_STORE_NAME,
)
from app.constants.localization import LANGUAGE_AR
from app.constants.orders import ORDER_STATUS_LABELS
from app.constants.products import DEFAULT_VARIANT_NAME

if TYPE_CHECKING:
    from app.features.orders.model import Order
    from app.features.orders.model import OrderItem


FONT_NAME = "IhmomSans"
FONT_BOLD_NAME = "IhmomSansBold"
FONT_PATHS = (
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("C:/Windows/Fonts/tahoma.ttf"),
)
FONT_BOLD_PATHS = (
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("C:/Windows/Fonts/arialbd.ttf"),
    Path("C:/Windows/Fonts/tahomabd.ttf"),
)

DARK = colors.HexColor("#263238")
ACCENT = colors.HexColor("#A98058")
LIGHT = colors.HexColor("#F5F5F3")
LINE = colors.HexColor("#D8D8D4")
MUTED = colors.HexColor("#667078")
MUTED_ON_DARK = colors.HexColor("#AEB6BC")

ARABIC_CHARACTERS = re.compile(r"[\u0600-\u06FF]")

ARABIC_RESHAPER = arabic_reshaper.ArabicReshaper(
    configuration={"ARABIC LIGATURE ALLAH": False}
)

ITEM_COLUMNS = (
    ("product", "product", 54 * mm, "table_text"),
    ("variant", "variant", 38 * mm, "table_text"),
    ("quantity", "quantity", 18 * mm, "table_count"),
    ("unit_price", "unit_price", 32 * mm, "table_end"),
    ("line_total", "line_total", 34 * mm, "table_end"),
)


def _find_font(paths: tuple[Path, ...]) -> Path | None:
    return next((path for path in paths if path.is_file()), None)


def _register_fonts() -> None:
    if FONT_NAME in pdfmetrics.getRegisteredFontNames():
        return

    regular_font = _find_font(FONT_PATHS)
    if regular_font is None:
        raise RuntimeError("No invoice-capable font is available")
    bold_font = _find_font(FONT_BOLD_PATHS) or regular_font
    pdfmetrics.registerFont(TTFont(FONT_NAME, str(regular_font)))
    pdfmetrics.registerFont(TTFont(FONT_BOLD_NAME, str(bold_font)))


def _shape(value, *, rtl: bool) -> str:
    text = str(value)
    if not ARABIC_CHARACTERS.search(text):
        return text

    base_dir = "R" if rtl else "L"
    return "\n".join(
        get_display(ARABIC_RESHAPER.reshape(line), base_dir=base_dir)
        for line in text.splitlines()
    )


def _paragraph(value, style: ParagraphStyle, *, rtl: bool) -> Paragraph:
    text = _shape(value, rtl=rtl)
    return Paragraph(escape(text).replace("\n", "<br/>"), style)


def _localized_text(english: str | None, arabic: str | None, language: str) -> str:
    primary, secondary = (
        (arabic, english) if language == LANGUAGE_AR else (english, arabic)
    )
    return (primary or "").strip() or (secondary or "").strip()


def _format_datetime(value: datetime, language: str) -> str:
    months = INVOICE_MONTHS.get(language, INVOICE_MONTHS[INVOICE_DEFAULT_LANGUAGE])
    month = months[value.month - 1]

    if language == LANGUAGE_AR:
        return f"{value.day} {month} {value.year}، {value:%H:%M}"

    return f"{month} {value.day}, {value.year}, {value:%H:%M}"


def _money(value: Decimal, language: str) -> str:
    amount = f"{value:,.2f}"
    if language == LANGUAGE_AR:
        return f"{amount} {CURRENCY_SYMBOL}"
    return f"{CURRENCY_SYMBOL}{amount}"


def _item_product_name(item: OrderItem, language: str) -> str:
    return _localized_text(item.product_name_en, item.product_name_ar, language)


def _item_variant_name(item: OrderItem, labels: dict[str, str], language: str) -> str:
    name = _localized_text(item.variant_name_en, item.variant_name_ar, language)
    if not name or name == DEFAULT_VARIANT_NAME:
        return labels["default_variant"]
    return name


def _styles(language: str) -> dict[str, ParagraphStyle]:
    is_rtl = language == LANGUAGE_AR
    start = TA_RIGHT if is_rtl else TA_LEFT
    end = TA_LEFT if is_rtl else TA_RIGHT

    return {
        "brand": ParagraphStyle(
            "Brand",
            fontName=FONT_BOLD_NAME,
            fontSize=20,
            leading=24,
            textColor=colors.white,
            alignment=start,
        ),
        "title": ParagraphStyle(
            "Title",
            fontName=FONT_BOLD_NAME,
            fontSize=13,
            leading=18,
            textColor=colors.white,
            alignment=start,
        ),
        "meta_label": ParagraphStyle(
            "MetaLabel",
            fontName=FONT_NAME,
            fontSize=8,
            leading=11,
            textColor=MUTED_ON_DARK,
            alignment=start,
        ),
        "meta_value": ParagraphStyle(
            "MetaValue",
            fontName=FONT_BOLD_NAME,
            fontSize=9.5,
            leading=14,
            textColor=colors.white,
            alignment=end,
        ),
        "section": ParagraphStyle(
            "Section",
            fontName=FONT_BOLD_NAME,
            fontSize=11,
            leading=15,
            textColor=DARK,
            alignment=start,
        ),
        "label": ParagraphStyle(
            "Label",
            fontName=FONT_NAME,
            fontSize=8,
            leading=11,
            textColor=MUTED,
            alignment=start,
        ),
        "value": ParagraphStyle(
            "Value",
            fontName=FONT_NAME,
            fontSize=9.5,
            leading=14,
            textColor=DARK,
            alignment=start,
        ),
        "strong": ParagraphStyle(
            "Strong",
            fontName=FONT_BOLD_NAME,
            fontSize=9.5,
            leading=14,
            textColor=DARK,
            alignment=start,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            fontName=FONT_BOLD_NAME,
            fontSize=8,
            leading=11,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "table_text": ParagraphStyle(
            "TableText",
            fontName=FONT_NAME,
            fontSize=8.5,
            leading=12,
            textColor=DARK,
            alignment=start,
        ),
        "table_end": ParagraphStyle(
            "TableEnd",
            fontName=FONT_NAME,
            fontSize=8.5,
            leading=12,
            textColor=DARK,
            alignment=end,
        ),
        "table_count": ParagraphStyle(
            "TableCount",
            fontName=FONT_NAME,
            fontSize=8.5,
            leading=12,
            textColor=DARK,
            alignment=TA_CENTER,
        ),
        "summary_label": ParagraphStyle(
            "SummaryLabel",
            fontName=FONT_NAME,
            fontSize=9,
            leading=13,
            textColor=DARK,
            alignment=start,
        ),
        "summary_value": ParagraphStyle(
            "SummaryValue",
            fontName=FONT_NAME,
            fontSize=9,
            leading=13,
            textColor=DARK,
            alignment=end,
        ),
        "summary_total": ParagraphStyle(
            "SummaryTotal",
            fontName=FONT_BOLD_NAME,
            fontSize=9.5,
            leading=14,
            textColor=DARK,
            alignment=start,
        ),
        "summary_total_value": ParagraphStyle(
            "SummaryTotalValue",
            fontName=FONT_BOLD_NAME,
            fontSize=9.5,
            leading=14,
            textColor=ACCENT,
            alignment=end,
        ),
        "footer": ParagraphStyle(
            "Footer",
            fontName=FONT_NAME,
            fontSize=8.5,
            leading=12,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }


def _header(
    order: Order,
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    language: str,
) -> Table:
    is_rtl = language == LANGUAGE_AR
    status = ORDER_STATUS_LABELS.get(language, {}).get(order.status, order.status)
    metadata_rows = [
        (
            labels["status"],
            _paragraph(status, styles["meta_value"], rtl=is_rtl),
        ),
        (
            labels["date"],
            _paragraph(
                _format_datetime(order.created_at, language),
                styles["meta_value"],
                rtl=is_rtl,
            ),
        ),
        (
            labels["order_number"],
            _paragraph(order.order_number, styles["meta_value"], rtl=False),
        ),
    ]
    rows = [
        [
            _paragraph(label, styles["meta_label"], rtl=is_rtl),
            value,
        ]
        for label, value in metadata_rows
    ]
    if is_rtl:
        rows = [[value, label] for label, value in rows]

    metadata = Table(
        rows,
        colWidths=(55 * mm, 29 * mm) if is_rtl else (29 * mm, 55 * mm),
    )
    metadata.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )

    brand = [
        _paragraph(
            INVOICE_STORE_NAME.get(
                language, INVOICE_STORE_NAME[INVOICE_DEFAULT_LANGUAGE]
            ),
            styles["brand"],
            rtl=is_rtl,
        ),
        Spacer(1, 1.5 * mm),
        _paragraph(labels["title"], styles["title"], rtl=is_rtl),
    ]
    cells = [metadata, brand] if is_rtl else [brand, metadata]
    header = Table(
        [cells],
        colWidths=(90 * mm, 88 * mm) if is_rtl else (88 * mm, 90 * mm),
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), DARK),
                ("LINEBELOW", (0, 0), (-1, -1), 2, ACCENT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return header


def _details(
    order: Order,
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    language: str,
) -> Table:
    is_rtl = language == LANGUAGE_AR
    area = _localized_text(
        order.delivery_area.name_en,
        order.delivery_area.name_ar,
        language,
    )
    notes = (
        order.notes.strip()
        if order.notes and order.notes.strip()
        else labels["no_notes"]
    )

    customer = [
        _paragraph(labels["customer"], styles["section"], rtl=is_rtl),
        _paragraph(labels["name"], styles["label"], rtl=is_rtl),
        _paragraph(order.customer_name, styles["strong"], rtl=is_rtl),
        _paragraph(labels["phone"], styles["label"], rtl=is_rtl),
        _paragraph(order.customer_phone, styles["strong"], rtl=False),
    ]
    delivery = [
        _paragraph(labels["delivery"], styles["section"], rtl=is_rtl),
        _paragraph(labels["area"], styles["label"], rtl=is_rtl),
        _paragraph(area, styles["strong"], rtl=is_rtl),
        _paragraph(labels["address"], styles["label"], rtl=is_rtl),
        _paragraph(order.address, styles["value"], rtl=is_rtl),
        _paragraph(labels["notes"], styles["label"], rtl=is_rtl),
        _paragraph(notes, styles["value"], rtl=is_rtl),
    ]

    cells = [delivery, customer] if is_rtl else [customer, delivery]
    table = Table([cells], colWidths=[89 * mm, 89 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LINEBEFORE", (1, 0), (1, 0), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return table


def _items(
    order: Order,
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    language: str,
) -> Table:
    is_rtl = language == LANGUAGE_AR
    columns = tuple(reversed(ITEM_COLUMNS)) if is_rtl else ITEM_COLUMNS

    header = [
        _paragraph(labels[label_key], styles["table_header"], rtl=is_rtl)
        for _, label_key, _, _ in columns
    ]
    rows = [header]

    for item in order.items:
        values = {
            "product": _paragraph(
                _item_product_name(item, language),
                styles["table_text"],
                rtl=is_rtl,
            ),
            "variant": _paragraph(
                _item_variant_name(item, labels, language),
                styles["table_text"],
                rtl=is_rtl,
            ),
            "quantity": _paragraph(item.quantity, styles["table_count"], rtl=False),
            "unit_price": _paragraph(
                _money(item.unit_price, language),
                styles["table_end"],
                rtl=False,
            ),
            "line_total": _paragraph(
                _money(item.total, language),
                styles["table_end"],
                rtl=False,
            ),
        }
        rows.append([values[key] for key, _, _, _ in columns])

    table = Table(
        rows,
        colWidths=[width for _, _, width, _ in columns],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), DARK),
                ("LINEBELOW", (0, 0), (-1, 0), 1.5, ACCENT),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LINEBELOW", (0, 1), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _summary(
    order: Order,
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    language: str,
) -> Table:
    is_rtl = language == LANGUAGE_AR
    lines = (
        (labels["subtotal"], _money(order.subtotal, language), False),
        (labels["delivery_fee"], _money(order.delivery_fee, language), False),
        (labels["total"], _money(order.total, language), True),
    )

    rows = []
    for label, amount, is_total in lines:
        label_style = styles["summary_total"] if is_total else styles["summary_label"]
        value_style = (
            styles["summary_total_value"] if is_total else styles["summary_value"]
        )
        label_cell = _paragraph(label, label_style, rtl=is_rtl)
        value_cell = _paragraph(amount, value_style, rtl=False)
        rows.append([value_cell, label_cell] if is_rtl else [label_cell, value_cell])

    table = Table(
        rows,
        colWidths=[45 * mm, 45 * mm],
        hAlign="LEFT" if is_rtl else "RIGHT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LINEBELOW", (0, 0), (-1, 1), 0.35, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _draw_page(canvas, document) -> None:
    canvas.saveState()
    canvas.setTitle(document.invoice_title)
    canvas.setAuthor(document.invoice_store_name)
    canvas.setStrokeColor(LINE)
    canvas.line(16 * mm, 13 * mm, A4[0] - 16 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT_NAME, 7.5)
    canvas.drawString(16 * mm, 8.5 * mm, document.invoice_order_number)
    canvas.drawRightString(
        A4[0] - 16 * mm,
        8.5 * mm,
        _shape(
            document.invoice_store_name,
            rtl=document.invoice_language == LANGUAGE_AR,
        ),
    )
    canvas.drawCentredString(A4[0] / 2, 8.5 * mm, str(document.page))
    canvas.restoreState()


def generate_order_invoice(
    order: Order,
    language: str = INVOICE_DEFAULT_LANGUAGE,
) -> bytes:
    if language not in INVOICE_LABELS:
        language = INVOICE_DEFAULT_LANGUAGE

    _register_fonts()
    labels = INVOICE_LABELS[language]
    styles = _styles(language)
    is_rtl = language == LANGUAGE_AR

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=18 * mm,
    )
    document.invoice_order_number = order.order_number
    document.invoice_language = language
    document.invoice_store_name = INVOICE_STORE_NAME.get(
        language, INVOICE_STORE_NAME[INVOICE_DEFAULT_LANGUAGE]
    )
    document.invoice_title = f"{document.invoice_store_name} - {labels['title']}"

    story = [
        _header(order, styles, labels, language),
        Spacer(1, 6 * mm),
        _details(order, styles, labels, language),
        Spacer(1, 5 * mm),
        _paragraph(labels["items"], styles["section"], rtl=is_rtl),
        Spacer(1, 2 * mm),
        _items(order, styles, labels, language),
        Spacer(1, 6 * mm),
        _summary(order, styles, labels, language),
        Spacer(1, 6 * mm),
        _paragraph(labels["thanks"], styles["footer"], rtl=is_rtl),
    ]
    document.build(story, onFirstPage=_draw_page, onLaterPages=_draw_page)
    return buffer.getvalue()
