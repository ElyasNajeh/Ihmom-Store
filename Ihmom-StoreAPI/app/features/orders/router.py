from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Header,
    Path,
    Query,
    Request,
    status,
)
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import (
    client_ip,
    enforce_checkout_limit,
    enforce_order_history_limit,
)
from app.core.security import (
    OrderHistoryClaims,
    create_order_history_token,
    get_current_admin,
    get_order_history_claims,
)
from app.constants.invoice import (
    INVOICE_DEFAULT_LANGUAGE,
    INVOICE_FILENAME_TEMPLATE,
    INVOICE_LANGUAGE_QUERY_PARAM,
)
from app.constants.localization import Language
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.orders import service
from app.features.orders.invoice import generate_order_invoice
from app.features.orders.model import Order as OrderModel
from app.features.orders.schema import (
    CheckoutOrderResponse,
    CheckoutRequest,
    OrderHistoryItemResponse,
    OrderHistoryTokenResponse,
    OrderHistoryVerifyRequest,
    OrderItemResponse,
    OrderQuery,
    OrderResponse,
    OrderSortBy,
    OrderStatus,
    OrderStatusUpdate,
)
from app.constants.query import SortDirection
from app.shared.query import QueryRules, parse_query
from app.shared.schema import PageResponse


router = APIRouter(prefix="/orders", tags=["Orders"])


def invoice_response(order: OrderModel, language: Language) -> Response:
    try:
        pdf = generate_order_invoice(order, language.value)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail="An invoice font is not available",
        ) from exc
    filename = INVOICE_FILENAME_TEMPLATE.format(order_number=order.order_number)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "private, no-store",
        },
    )


def validate_order_query(
    request: Request,
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=150),
    filter_status: OrderStatus | None = Query(None, alias="filter[status]"),
    delivery_area_id: int | None = Query(
        None,
        ge=1,
        alias="filter[delivery_area_id]",
    ),
    date_from: date | None = Query(None, alias="filter[date_from]"),
    date_to: date | None = Query(None, alias="filter[date_to]"),
    min_total: Decimal | None = Query(
        None,
        ge=0,
        max_digits=10,
        decimal_places=2,
        alias="filter[min_total]",
    ),
    max_total: Decimal | None = Query(
        None,
        ge=0,
        max_digits=10,
        decimal_places=2,
        alias="filter[max_total]",
    ),
    sort_by: OrderSortBy | None = Query(None),
    order: SortDirection | None = Query(None),
) -> OrderQuery:
    return parse_query(
        request,
        OrderQuery,
        values={
            "page": page,
            "page_size": page_size,
            "search": search,
            "sort_by": sort_by,
            "order": order,
        },
        filters={
            "status": filter_status,
            "delivery_area_id": delivery_area_id,
            "date_from": date_from,
            "date_to": date_to,
            "min_total": min_total,
            "max_total": max_total,
        },
        rules=QueryRules.create(
            declared={
                "page",
                "page_size",
                "search",
                "filter[status]",
                "filter[delivery_area_id]",
                "filter[date_from]",
                "filter[date_to]",
                "filter[min_total]",
                "filter[max_total]",
                "sort_by",
                "order",
            },
            filter_fields={
                "status",
                "delivery_area_id",
                "date_from",
                "date_to",
                "min_total",
                "max_total",
            },
            bare_filter_aliases=True,
            reject_repeated_filters=True,
            sort_order_alias=True,
        ),
    )


@router.post(
    "/checkout",
    response_model=CheckoutOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def checkout(
    checkout_data: CheckoutRequest,
    request: Request,
    idempotency_key: Annotated[UUID, Header(alias="Idempotency-Key")],
    db: Session = Depends(get_db),
):
    canonical_key = str(idempotency_key)
    await enforce_checkout_limit(client_ip(request), canonical_key)
    return await run_in_threadpool(
        service.checkout,
        db,
        checkout_data,
        canonical_key,
    )


@router.post(
    "/history/verify",
    response_model=OrderHistoryTokenResponse,
)
async def verify_order_history(
    history_data: OrderHistoryVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"

    await enforce_order_history_limit(client_ip(request), history_data.phone)
    order = await run_in_threadpool(
        service.verify_order_history, db, history_data.phone, history_data.order_number
    )
    token = create_order_history_token(
        order.customer_phone,
        order.order_number,
        timedelta(minutes=settings.ORDER_HISTORY_TOKEN_EXPIRE_MINUTES),
    )

    return {
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": settings.ORDER_HISTORY_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get(
    "/history",
    response_model=OrderHistoryItemResponse,
)
def get_order_history(
    response: Response,
    claims: OrderHistoryClaims = Depends(get_order_history_claims),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    return service.get_verified_order_history(db, claims)


@router.get(
    "/history/invoice",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def get_order_history_invoice(
    claims: OrderHistoryClaims = Depends(get_order_history_claims),
    db: Session = Depends(get_db),
    language: Language = Query(
        INVOICE_DEFAULT_LANGUAGE,
        alias=INVOICE_LANGUAGE_QUERY_PARAM,
    ),
):
    order = service.get_verified_order(db, claims)
    return invoice_response(order, language)


@router.get("/admin/all", response_model=PageResponse[OrderResponse])
def get_orders(
    query_data: Annotated[OrderQuery, Depends(validate_order_query)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_orders(db, query_data)


@router.get(
    "/admin/{order_id}/invoice",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def get_order_invoice(
    order_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
    language: Language = Query(
        INVOICE_DEFAULT_LANGUAGE,
        alias=INVOICE_LANGUAGE_QUERY_PARAM,
    ),
):
    order = service.get_order(db, order_id)
    return invoice_response(order, language)


@router.get(
    "/admin/{order_id}/items",
    response_model=list[OrderItemResponse],
)
def get_order_items(
    order_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_order_items(db, order_id)


@router.patch("/admin/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: Annotated[int, Path(ge=1)],
    status_data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.update_order_status(db, order_id, status_data)


@router.get("/admin/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_order(db, order_id)
