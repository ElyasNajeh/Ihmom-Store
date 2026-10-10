from __future__ import annotations

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

if TYPE_CHECKING:
    from app.features.orders.model import Order


ARABIC_FONT_NAME = "IhmomArabic"
ARABIC_FONT_BOLD_NAME = "IhmomArabicBold"
ARABIC_FONT_PATHS = (
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("C:/Windows/Fonts/tahoma.ttf"),
)
ARABIC_FONT_BOLD_PATHS = (
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("C:/Windows/Fonts/arialbd.ttf"),
    Path("C:/Windows/Fonts/tahomabd.ttf"),
)

DARK = colors.HexColor("#263238")
ACCENT = colors.HexColor("#A98058")
LIGHT = colors.HexColor("#F5F5F3")
LINE = colors.HexColor("#D8D8D4")
MUTED = colors.HexColor("#667078")

STATUS_LABELS = {
    "pending": "قيد الانتظار",
    "confirmed": "مؤكد",
    "out_for_delivery": "قيد التوصيل",
    "delivered": "تم التوصيل",
    "cancelled": "ملغي",
}

ARABIC_RESHAPER = arabic_reshaper.ArabicReshaper(
    configuration={"ARABIC LIGATURE ALLAH": False}
)


def _find_font(paths: tuple[Path, ...]) -> Path | None:
    return next((path for path in paths if path.is_file()), None)


def _register_arabic_fonts() -> None:
    if ARABIC_FONT_NAME in pdfmetrics.getRegisteredFontNames():
        return

    regular_font = _find_font(ARABIC_FONT_PATHS)
    if regular_font is None:
        raise RuntimeError("No Arabic-capable font is available")
    bold_font = _find_font(ARABIC_FONT_BOLD_PATHS) or regular_font
    pdfmetrics.registerFont(TTFont(ARABIC_FONT_NAME, str(regular_font)))
    pdfmetrics.registerFont(TTFont(ARABIC_FONT_BOLD_NAME, str(bold_font)))


def _rtl(value: str | int) -> str:
    return "\n".join(
        get_display(ARABIC_RESHAPER.reshape(line), base_dir="R")
        for line in str(value).splitlines()
    )


def _paragraph(value, style: ParagraphStyle, *, rtl: bool = True) -> Paragraph:
    text = _rtl(value) if rtl else str(value)
    return Paragraph(escape(text).replace("\n", "<br/>"), style)


def _money(value: Decimal) -> str:
    return f"{value:,.2f} ₪"


def _styles() -> dict[str, ParagraphStyle]:
    return {
        "brand": ParagraphStyle(
            "Brand",
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "title": ParagraphStyle(
            "Title",
            fontName=ARABIC_FONT_BOLD_NAME,
            fontSize=13,
            leading=18,
            textColor=colors.white,
            alignment=TA_RIGHT,
        ),
        "section": ParagraphStyle(
            "Section",
            fontName=ARABIC_FONT_BOLD_NAME,
            fontSize=11,
            leading=15,
            textColor=DARK,
            alignment=TA_RIGHT,
        ),
        "label": ParagraphStyle(
            "Label",
            fontName=ARABIC_FONT_NAME,
            fontSize=8,
            leading=11,
            textColor=MUTED,
            alignment=TA_RIGHT,
        ),
        "value": ParagraphStyle(
            "Value",
            fontName=ARABIC_FONT_BOLD_NAME,
            fontSize=9.5,
            leading=14,
            textColor=DARK,
            alignment=TA_RIGHT,
        ),
        "ltr_value": ParagraphStyle(
            "LtrValue",
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=DARK,
            alignment=TA_LEFT,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            fontName=ARABIC_FONT_BOLD_NAME,
            fontSize=8,
            leading=11,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "table_text": ParagraphStyle(
            "TableText",
            fontName=ARABIC_FONT_NAME,
            fontSize=8.5,
            leading=12,
            textColor=DARK,
            alignment=TA_RIGHT,
        ),
        "table_number": ParagraphStyle(
            "TableNumber",
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=DARK,
            alignment=TA_CENTER,
        ),
        "summary": ParagraphStyle(
            "Summary",
            fontName=ARABIC_FONT_NAME,
            fontSize=9,
            leading=13,
            textColor=DARK,
            alignment=TA_RIGHT,
        ),
        "summary_value": ParagraphStyle(
            "SummaryValue",
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=DARK,
            alignment=TA_LEFT,
        ),
        "footer": ParagraphStyle(
            "Footer",
            fontName=ARABIC_FONT_NAME,
            fontSize=8.5,
            leading=12,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }


def _header(order: Order, styles: dict[str, ParagraphStyle]) -> Table:
    status = STATUS_LABELS.get(order.status, order.status)
    metadata = Table(
        [
            [
                _paragraph(status, styles["value"]),
                _paragraph("الحالة", styles["label"]),
            ],
            [
                _paragraph(
                    order.created_at.strftime("%Y-%m-%d %H:%M"),
                    styles["ltr_value"],
                    rtl=False,
                ),
                _paragraph("التاريخ والوقت", styles["label"]),
            ],
            [
                _paragraph(order.order_number, styles["ltr_value"], rtl=False),
                _paragraph("رقم الطلب", styles["label"]),
            ],
        ],
        colWidths=[55 * mm, 29 * mm],
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
    header = Table(
        [
            [
                [
                    _paragraph("Ihmom Store", styles["brand"], rtl=False),
                    Spacer(1, 1.5 * mm),
                    _paragraph("فاتورة طلب", styles["title"]),
                ],
                metadata,
            ]
        ],
        colWidths=[88 * mm, 90 * mm],
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


def _details(order: Order, styles: dict[str, ParagraphStyle]) -> Table:
    customer = [
        _paragraph("بيانات العميل", styles["section"]),
        _paragraph("الاسم", styles["label"]),
        _paragraph(order.customer_name, styles["value"]),
        _paragraph("رقم الهاتف", styles["label"]),
        _paragraph(order.customer_phone, styles["ltr_value"], rtl=False),
    ]
    delivery = [
        _paragraph("بيانات التوصيل", styles["section"]),
        _paragraph("المنطقة", styles["label"]),
        _paragraph(order.delivery_area.name_ar, styles["value"]),
        _paragraph("العنوان", styles["label"]),
        _paragraph(order.address, styles["value"]),
    ]
    table = Table([[delivery, customer]], colWidths=[89 * mm, 89 * mm])
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


def _items(order: Order, styles: dict[str, ParagraphStyle]) -> Table:
    rows = [
        [
            _paragraph("الإجمالي", styles["table_header"]),
            _paragraph("سعر الوحدة", styles["table_header"]),
            _paragraph("الكمية", styles["table_header"]),
            _paragraph("الخيار", styles["table_header"]),
            _paragraph("المنتج", styles["table_header"]),
        ]
    ]
    for item in order.items:
        option = item.variant_name_ar or "—"
        rows.append(
            [
                _paragraph(_money(item.total), styles["table_number"], rtl=False),
                _paragraph(
                    _money(item.unit_price),
                    styles["table_number"],
                    rtl=False,
                ),
                _paragraph(item.quantity, styles["table_number"], rtl=False),
                _paragraph(option, styles["table_text"]),
                _paragraph(item.product_name_ar, styles["table_text"]),
            ]
        )
    table = Table(
        rows,
        colWidths=[32 * mm, 32 * mm, 18 * mm, 40 * mm, 56 * mm],
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


def _summary(order: Order, styles: dict[str, ParagraphStyle]) -> Table:
    rows = [
        [
            _paragraph(_money(order.subtotal), styles["summary_value"], rtl=False),
            _paragraph("المجموع الفرعي", styles["summary"]),
        ],
        [
            _paragraph(
                _money(order.delivery_fee),
                styles["summary_value"],
                rtl=False,
            ),
            _paragraph("رسوم التوصيل", styles["summary"]),
        ],
        [
            _paragraph(_money(order.total), styles["summary_value"], rtl=False),
            _paragraph("الإجمالي", styles["section"]),
        ],
    ]
    table = Table(rows, colWidths=[45 * mm, 45 * mm], hAlign="LEFT")
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
    canvas.setTitle(f"Ihmom Store Invoice {document.invoice_order_number}")
    canvas.setAuthor("Ihmom Store")
    canvas.setStrokeColor(LINE)
    canvas.line(16 * mm, 13 * mm, A4[0] - 16 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(16 * mm, 8.5 * mm, document.invoice_order_number)
    canvas.drawRightString(A4[0] - 16 * mm, 8.5 * mm, "Ihmom Store")
    canvas.drawCentredString(A4[0] / 2, 8.5 * mm, str(document.page))
    canvas.restoreState()


def generate_order_invoice(order: Order) -> bytes:
    _register_arabic_fonts()
    styles = _styles()
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

    notes = order.notes or "لا توجد ملاحظات"
    story = [
        _header(order, styles),
        Spacer(1, 6 * mm),
        _details(order, styles),
        Spacer(1, 5 * mm),
        _paragraph("ملاحظات", styles["section"]),
        _paragraph(notes, styles["value"]),
        Spacer(1, 5 * mm),
        _paragraph("تفاصيل الطلب", styles["section"]),
        _items(order, styles),
        Spacer(1, 6 * mm),
        _summary(order, styles),
        Spacer(1, 5 * mm),
        _paragraph("شكراً لاختياركم Ihmom Store", styles["footer"]),
    ]
    document.build(story, onFirstPage=_draw_page, onLaterPages=_draw_page)
    return buffer.getvalue()
