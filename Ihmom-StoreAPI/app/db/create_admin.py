from getpass import getpass

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.features.admins.model import Admin
from app.features.admins.schema import AdminCreate


def create_admin() -> None:
    admin_data = AdminCreate(
        username=input("Username: "),
        email=input("Email: "),
        password=getpass("Password: "),
    )
    email = str(admin_data.email).lower()

    db = SessionLocal()

    try:
        existing_admin = (
            db.query(Admin)
            .filter(
                (Admin.username == admin_data.username)
                | (Admin.email == email)
            )
            .first()
        )

        if existing_admin:
            print(
                "Admin already exists with username "
                f"'{existing_admin.username}' or email '{existing_admin.email}'."
            )
            return

        admin = Admin(
            username=admin_data.username,
            email=email,
            hashed_password=hash_password(admin_data.password),
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(
            f"Admin '{admin.username}' ({admin.email}) created successfully."
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
