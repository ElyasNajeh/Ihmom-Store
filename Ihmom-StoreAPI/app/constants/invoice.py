from app.constants.localization import DEFAULT_LANGUAGE, LANGUAGE_AR, LANGUAGE_EN

INVOICE_DEFAULT_LANGUAGE = DEFAULT_LANGUAGE

INVOICE_LANGUAGE_QUERY_PARAM = "lang"

INVOICE_FILENAME_TEMPLATE = "ihmom-store-invoice-{order_number}.pdf"

INVOICE_STORE_NAME = {
    LANGUAGE_EN: "Ihmom Store",
    LANGUAGE_AR: "الهموم ستور",
}

INVOICE_LABELS = {
    LANGUAGE_EN: {
        "title": "Order invoice",
        "status": "Status",
        "date": "Date",
        "order_number": "Order number",
        "customer": "Customer details",
        "name": "Name",
        "phone": "Phone",
        "delivery": "Delivery details",
        "area": "Delivery area",
        "address": "Address",
        "notes": "Notes",
        "no_notes": "No notes",
        "items": "Order items",
        "product": "Product",
        "variant": "Variant",
        "quantity": "Qty",
        "unit_price": "Unit price",
        "line_total": "Line total",
        "subtotal": "Subtotal",
        "delivery_fee": "Delivery",
        "total": "Total",
        "default_variant": "Default",
        "thanks": "Thank you for shopping at Ihmom Store",
    },
    LANGUAGE_AR: {
        "title": "فاتورة طلب",
        "status": "الحالة",
        "date": "التاريخ",
        "order_number": "رقم الطلب",
        "customer": "بيانات العميل",
        "name": "الاسم",
        "phone": "رقم الهاتف",
        "delivery": "بيانات التوصيل",
        "area": "منطقة التوصيل",
        "address": "العنوان",
        "notes": "الملاحظات",
        "no_notes": "لا توجد ملاحظات",
        "items": "تفاصيل الطلب",
        "product": "المنتج",
        "variant": "الخيار",
        "quantity": "الكمية",
        "unit_price": "سعر الوحدة",
        "line_total": "الإجمالي",
        "subtotal": "المجموع الفرعي",
        "delivery_fee": "التوصيل",
        "total": "الإجمالي",
        "default_variant": "افتراضي",
        "thanks": "شكراً لاختياركم الهموم ستور",
    },
}

INVOICE_MONTHS = {
    LANGUAGE_EN: (
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ),
    LANGUAGE_AR: (
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "مايو",
        "يونيو",
        "يوليو",
        "أغسطس",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
    ),
}
