from __future__ import annotations

from app.core.config import settings

ADMIN_SHARED_PASSWORD = "Admin_main@123"


def main() -> None:
    print(f"\n{'=' * 60}")
    print(f"  HackSphere Admin Access")
    print(f"{'=' * 60}")
    print()
    print(f"  Admin password: {ADMIN_SHARED_PASSWORD}")
    print()
    print(f"  How it works:")
    print(f"    1. Go to the login page")
    print(f"    2. Enter ANY email address")
    print(f"    3. Enter password: {ADMIN_SHARED_PASSWORD}")
    print(f"    4. You are instantly granted admin access")
    print()
    print(f"  First login with a new email auto-creates an admin account.")
    print(f"  Existing users with that email get upgraded to admin.")
    print()
    print(f"  Server: http://{settings.HOST}:{settings.PORT}")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()
