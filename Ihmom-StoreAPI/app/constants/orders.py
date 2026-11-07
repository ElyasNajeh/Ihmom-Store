from enum import Enum

from app.constants.common import MAX_INT32, MAX_MONEY_AMOUNT, MONEY_QUANTUM
from app.constants.localization import LANGUAGE_AR, LANGUAGE_EN

ORDER_STATUS_CHECK_SQL = (
    "status in ('pending', 'confirmed', 'out_for_delivery', "
    "'delivered', 'cancelled')"
)

ORDER_NUMBER_MAX_LENGTH = 50
ORDER_NUMBER_PREFIX = "IHM-"
ORDER_NUMBER_TOKEN_BYTES = 18
ORDER_NUMBER_ATTEMPTS = 5

ORDER_CUSTOMER_NAME_MAX_LENGTH = 150
ORDER_CUSTOMER_PHONE_MAX_LENGTH = 30
ORDER_SEARCH_MAX_LENGTH = 150

ORDER_QUANTITY_MIN = 1
ORDER_QUANTITY_MAX = MAX_INT32

ORDER_MONEY_MAX = MAX_MONEY_AMOUNT
ORDER_MONEY_QUANTUM = MONEY_QUANTUM
ORDER_MONEY_MAX_DIGITS = 10
ORDER_MONEY_DECIMAL_PLACES = 2

ORDER_INITIAL_STATUS = "pending"
ORDER_STATUS_COLUMN_LENGTH = 30

ORDER_STATUS_LABELS = {
    LANGUAGE_EN: {
        "pending": "Pending",
        "confirmed": "Confirmed",
        "out_for_delivery": "Out for delivery",
        "delivered": "Delivered",
        "cancelled": "Cancelled",
    },
    LANGUAGE_AR: {
        "pending": "قيد المراجعة",
        "confirmed": "مؤكد",
        "out_for_delivery": "قيد التوصيل",
        "delivered": "تم التسليم",
        "cancelled": "ملغى",
    },
}

ORDER_STATUS_TRANSITIONS = {
    "pending": frozenset({"confirmed", "cancelled"}),
    "confirmed": frozenset({"out_for_delivery", "cancelled"}),
    "out_for_delivery": frozenset({"delivered", "cancelled"}),
    "delivered": frozenset(),
    "cancelled": frozenset(),
}


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


ORDER_STATUSES = tuple(status.value for status in OrderStatus)
