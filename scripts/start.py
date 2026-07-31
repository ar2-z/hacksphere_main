from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def get_local_ip() -> str:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "0.0.0.0"


def main() -> None:
    parser = argparse.ArgumentParser(description="Start HackSphere server")
    parser.add_argument(
        "--host", default="0.0.0.0",
        help="Host IP to bind to (default: 0.0.0.0 for all interfaces)",
    )
    parser.add_argument(
        "--port", type=int, default=8000,
        help="Port to bind to (default: 8000)",
    )
    parser.add_argument(
        "--seed-admins", action="store_true",
        help="Seed admin accounts before starting",
    )
    parser.add_argument(
        "--reload", action="store_true",
        help="Enable auto-reload for development",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent

    if args.seed_admins:
        print("[HackSphere] Seeding admin accounts...")
        subprocess.run(
            [sys.executable, str(project_root / "scripts" / "seed_admins.py")],
            cwd=str(project_root),
            check=True,
        )

    detected_ip = get_local_ip()
    host = args.host
    port = args.port

    if host == "0.0.0.0":
        print(f"\n{'=' * 60}")
        print(f"  HackSphere starting on ALL interfaces")
        print(f"  Local:    http://127.0.0.1:{port}")
        print(f"  Network:  http://{detected_ip}:{port}")
        print(f"{'=' * 60}")
        print(f"  Other devices on your LAN can access via:")
        print(f"    http://{detected_ip}:{port}")
        print(f"{'=' * 60}")
        print(f"\n  Admin access:")
        print(f"    Run: python scripts/seed_admins.py")
        print(f"{'=' * 60}\n")
    else:
        print(f"\nHackSphere starting on http://{host}:{port}\n")

    cmd = [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", host,
        "--port", str(port),
        "--log-level", "info",
    ]

    if args.reload:
        cmd.append("--reload")

    subprocess.run(cmd, cwd=str(project_root))


if __name__ == "__main__":
    main()
