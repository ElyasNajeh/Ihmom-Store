
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.features.admins.router import router as admins_router
from app.features.auth.router import router as auth_router
from app.features.brands.router import router as brands_router
from app.features.categories.router import router as categories_router
from app.features.customers.router import router as customers_router
from app.features.dashboard.router import router as dashboard_router
from app.features.delivery_areas.router import router as delivery_areas_router
from app.features.orders.router import router as orders_router
from app.features.products.router import router as products_router
from app.features.sliders.router import router as sliders_router

openapi_tags = [
    {
        "name": "Authentication",
        "description": (
            "Admin authentication, access-token renewal, logout, "
            "and the current admin profile."
        ),
    },
    {
        "name": "Admins",
        "description": "Admin account management.",
    },
    {
        "name": "Products",
        "description": "Product and product-variant management.",
    },
    {
        "name": "Categories",
        "description": "Product category management.",
    },
    {
        "name": "Brands",
        "description": "Product brand management.",
    },
    {
        "name": "Customers",
        "description": "Customer information and management.",
    },
    {
        "name": "Orders",
        "description": "Order management and order status operations.",
    },
    {
        "name": "Delivery Areas",
        "description": "Delivery area and delivery fee management.",
    },
    {
        "name": "Sliders",
        "description": "Homepage slider management.",
    },
    {
        "name": "Dashboard",
        "description": "Aggregated statistics for the admin dashboard.",
    },
    {
        "name": "Health",
        "description": "Basic API availability and health checks.",
    },
]

settings.UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "REST API for managing the store, including products, categories, "
        "brands, customers, orders, and administrative operations.\n\n"
        "Protected endpoints use a Bearer access token. Obtain one through "
        "`POST /auth/login` and provide it using the Authorize button. "
        "Refresh tokens are stored in an HttpOnly cookie and are not "
        "intended to be entered manually."
    ),
    version="1.0.0",
    openapi_tags=openapi_tags,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admins_router)
app.include_router(sliders_router)
app.include_router(categories_router)
app.include_router(brands_router)
app.include_router(customers_router)
app.include_router(delivery_areas_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(dashboard_router)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_ROOT), name="uploads")


@app.get("/", summary="API root", tags=["Health"])
def root():
    """Check that the API application is responding."""
    return {"message": f"{settings.APP_NAME} is running"}


@app.get("/health", summary="Health check", tags=["Health"])
def health():
    """Check the API's basic health status."""
    return {"status": "healthy"}
