#!/usr/bin/env python3
"""
Start a single backend server with configurable workers.
Run this on each backend laptop (Laptop 2, 3, etc.)

Usage:
    python scripts/start_server.py --port 8000 --workers 4
    python scripts/start_server.py --host 0.0.0.0 --port 8000 --workers 4 --seed-admins
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import socket
from pathlib import Path


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "0.0.0.0"


def main() -> None:
    parser = argparse.ArgumentParser(description="Start HackSphere backend server")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    parser.add_argument("--workers", type=int, default=2, help="Number of uvicorn workers (default: 2)")
    parser.add_argument("--seed-admins", action="store_true", help="Seed admin accounts first")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (dev only)")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    detected_ip = get_local_ip()

    if args.seed_admins:
        print("[HackSphere] Seeding admin accounts...")
        subprocess.run(
            [sys.executable, str(project_root / "scripts" / "seed_admins.py")],
            cwd=str(project_root),
            check=True,
        )

    print(f"\n{'=' * 60}")
    print(f"  HackSphere Backend Server")
    print(f"  Workers:   {args.workers}")
    print(f"  Local:     http://127.0.0.1:{args.port}")
    print(f"  Network:   http://{detected_ip}:{args.port}")
    print(f"  Health:    http://{detected_ip}:{args.port}/health")
    print(f"{'=' * 60}")
    print(f"  Other laptops can use this server at:")
    print(f"    http://{detected_ip}:{args.port}")
    print(f"{'=' * 60}\n")

    cmd = [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", args.host,
        "--port", str(args.port),
        "--workers", str(args.workers),
        "--log-level", "info",
    ]

    if args.reload:
        cmd.append("--reload")

    subprocess.run(cmd, cwd=str(project_root))


if __name__ == "__main__":
    main()
