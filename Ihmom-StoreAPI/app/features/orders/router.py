from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.admins.model import Admin
from app.features.orders import service
from app.features.orders.invoice import generate_order_invoice
from app.features.orders.schema import (
    CheckoutRequest,
    CheckoutOrderResponse,
    OrderFilters,
    OrderHistoryItemResponse,
    OrderHistoryRequest,
    OrderItemResponse,
    OrderResponse,
    OrderSort,
    OrderStatusUpdate,
    SortOrder,
)
from app.shared.schema import PageResponse

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "/checkout",
    response_model=CheckoutOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def checkout(
    checkout_data: CheckoutRequest,
    db: Session = Depends(get_db),
):
    return service.checkout(db, checkout_data)


@router.post(
    "/history",
    response_model=PageResponse[OrderHistoryItemResponse],
)
def get_order_history(
    history_data: OrderHistoryRequest,
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    return service.get_order_history(
        db,
        history_data.phone,
        page,
        page_size,
    )


@router.get("/admin/all", response_model=PageResponse[OrderResponse])
def get_orders(
    filters: Annotated[OrderFilters, Depends()],
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, max_length=150),
    sort_by: OrderSort = Query("created_at"),
    sort_order: SortOrder = Query("desc"),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_orders(
        db,
        page,
        page_size,
        search,
        filters,
        sort_by,
        sort_order,
    )


@router.get(
    "/admin/{order_id}/invoice",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def get_order_invoice(
    order_id: Annotated[int, Path(ge=1)],
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    order = service.get_order(db, order_id)
    try:
        pdf = generate_order_invoice(order)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail="An Arabic-capable invoice font is not available",
        ) from exc
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="ihmom-store-invoice-{order.order_number}.pdf"'
            ),
            "Cache-Control": "private, no-store",
        },
    )


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
