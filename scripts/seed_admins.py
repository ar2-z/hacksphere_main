from __future__ import annotations

import getpass
import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@hacksphere.dev"
ADMIN_FULL_NAME = "HackSphere Admin"


def main() -> None:
    password = os.environ.get("ADMIN_PASSWORD", "").strip()
    generated = False
    if not password:
        try:
            password = getpass.getpass("Enter admin password (leave empty to auto-generate): ")
        except (EOFError, KeyboardInterrupt):
            password = ""
        if not password:
            password = secrets.token_urlsafe(16)
            generated = True
    if len(password) < 8:
        print("Error: admin password must be at least 8 characters", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        admin = (
            db.query(User)
            .filter((User.username == ADMIN_USERNAME) | (User.email == ADMIN_EMAIL))
            .first()
        )
        if admin:
            admin.password_hash = get_password_hash(password)
            admin.role = "admin"
            admin.is_active = True
            print(f"Updated existing user to admin: {admin.username} ({admin.email})")
        else:
            admin = User(
                username=ADMIN_USERNAME,
                email=ADMIN_EMAIL,
                full_name=ADMIN_FULL_NAME,
                password_hash=get_password_hash(password),
                role="admin",
            )
            db.add(admin)
            print(f"Created admin account: {ADMIN_USERNAME} ({ADMIN_EMAIL})")
        db.commit()
    finally:
        db.close()

    if generated:
        print(f"\n  Generated admin password (save this now, it will not be shown again):")
        print(f"  {password}")
    print(f"\n  Login with username '{ADMIN_USERNAME}' or email '{ADMIN_EMAIL}'.")


if __name__ == "__main__":
    main()
