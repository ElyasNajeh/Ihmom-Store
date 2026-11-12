"""Real API fixture. Imports the backend test guard before application code."""
import sys
import os
import tempfile
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[3] / "Ihmom-StoreAPI"
sys.path.insert(0, str(API_ROOT))

os.environ.update({
    "DATABASE_HOST": "127.0.0.1", "DATABASE_PORT": "55432",
    "DATABASE_USER": "ihmom_test", "DATABASE_PASSWORD": "ihmom_test_only_password",
    "DATABASE_NAME": "ihmom_store_test", "REDIS_URL": "redis://127.0.0.1:57279/15",
    "SECRET_KEY": "browser-test-secret-never-for-production",
    "APP_NAME": "Ihmom Browser Test", "COOKIE_SECURE": "false",
    "CORS_ORIGINS": "http://127.0.0.1:4173",
    "UPLOAD_ROOT": str(Path(tempfile.gettempdir()) / "ihmom-browser-test-uploads"),
    "BIRD_NOTIFICATIONS_ENABLED": "false", "BIRD_API_KEY": "", "BIRD_WEBHOOK_SECRET": "",
})
from alembic.config import Config
from alembic import command
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.features.admins.model import Admin
from app.features.brands.model import Brand
from app.features.categories.model import Category
from app.features.delivery_areas.model import DeliveryArea
from app.features.products.model import Product, ProductVariant

settings.CORS_ORIGINS = "http://127.0.0.1:4173"
assert settings.DATABASE_NAME.endswith("_test")
config = Config(str(API_ROOT / "alembic.ini"))
config.set_main_option("script_location", str(API_ROOT / "alembic"))
command.upgrade(config, "head")
with SessionLocal() as db:
    if not db.query(Admin).filter_by(username="browser-admin").first():
        db.add(Admin(username="browser-admin", email="browser@example.com", hashed_password=hash_password("Browser-password-123!")))
    if not db.query(Product).filter_by(name_en="Browser Product").first():
        category = Category(name_ar="فئة المتصفح", name_en="Browser Category")
        brand = Brand(name_ar="علامة المتصفح", name_en="Browser Brand")
        area = DeliveryArea(name_ar="نابلس", name_en="Browser Area", delivery_fee="5.25")
        db.add_all([category, brand, area])
        db.flush()
        product = Product(category_id=category.id, brand_id=brand.id, name_ar="منتج المتصفح", name_en="Browser Product")
        db.add(product)
        db.flush()
        db.add(ProductVariant(product_id=product.id, name_ar="__default__", name_en="__default__", price="10.10", is_active=True))
    db.commit()

# Import only after CORS settings have been applied.
from app.main import app
import uvicorn
uvicorn.run(app, host="127.0.0.1", port=18080)
