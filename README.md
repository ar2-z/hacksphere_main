# HackSphere

Enterprise-grade Cloud-native Hackathon Management Platform

## Features

- Multi-phase hackathon support (Quiz, Debugging, Ideathon)
- Real-time leaderboards and updates via WebSockets
- Role-based access control (Super Admin, Admin, Team Leader, Team Member)
- Anti-cheat monitoring system
- Clue-based progressive challenge system
- Secure code execution sandbox
- Cloud-native architecture

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2
- **Database**: PostgreSQL 16, Redis 7
- **Task Queue**: Celery with Redis broker
- **Containerization**: Docker, Docker Compose
- **Authentication**: JWT with role-based access control

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd hacksphere
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   ```

3. Install dependencies:
   ```bash
   pip install -e ".[dev]"
   ```

4. Copy environment file:
   ```bash
   cp .env.example .env
   ```

5. Start services with Docker Compose:
   ```bash
   docker-compose up -d postgres redis
   ```

6. Run database migrations:
   ```bash
   alembic upgrade head
   ```

7. Start the development server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Docker Setup

1. Build and start all services:
   ```bash
   docker-compose up -d
   ```

2. Access the API at: http://localhost:8000

3. Access documentation at: http://localhost:8000/docs

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
hacksphere/
├── app/
│   ├── api/v1/          # API routes and schemas
│   ├── core/            # Configuration, security, celery
│   ├── domain/          # Business logic entities
│   ├── infrastructure/  # Database, cache, storage
│   ├── services/        # Application services
│   ├── websockets/      # WebSocket handlers
│   └── middleware/       # Authentication middleware
├── alembic/             # Database migrations
├── tests/               # Test suite
├── docker-compose.yml   # Docker configuration
└── pyproject.toml       # Project configuration
```

## Testing

Run the test suite:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app tests/
```

## License

MIT License
