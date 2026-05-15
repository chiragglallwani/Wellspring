# Wellspring

Creator admin portal for managing wellness programs, sessions, media uploads, and audit logs.

## Prerequisites

Install the following before you begin:

| Software | Purpose | Get it |
|----------|---------|--------|
| **Docker Desktop** (or Docker Engine + Compose) | Runs the API, PostgreSQL, Mailhog, and MinIO locally | [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Node.js** (v20 LTS or newer recommended) | Runs the Next.js frontend on your machine | [https://nodejs.org](https://nodejs.org) |

Verify installations:

```bash
docker --version
docker compose version
node --version
npm --version
```

## Local setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd Wellspring
```

### 2. Configure environment variables

**Backend** — copy the example env file and adjust values if needed:

```bash
cp backend/.env.example backend/.env.local
```

**Frontend** — copy the example env file:

```bash
cp frontend/.env.example frontend/.env
```

The defaults point the frontend at `http://localhost:4443` and match the Docker services started by the backend compose file.

### 3. Start the backend (Docker)

From the `backend` directory, build and start all services (API, Postgres, Mailhog, MinIO):

```bash
cd backend
docker compose up --build
```

The API listens on **http://localhost:4443**. Database migrations run automatically when the backend starts.

Leave this terminal running. To stop later: `Ctrl+C`, then optionally `docker compose down`.

### 4. Start the frontend

In a **new terminal**, from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## Local services

| Service | URL | Notes |
|---------|-----|--------|
| Frontend | http://localhost:3000 | Next.js dev server |
| API | http://localhost:4443 | Express backend (`/api/v1`) |
| Mailhog (email UI) | http://localhost:8025 | Catches outbound mail (e.g. password reset OTP) |
| MinIO console | http://localhost:9001 | Object storage admin (`minio` / `minio12345`) |

## Demo accounts (optional)

If you have run database migrations including the seed migration (`00011-seed-demo-users-and-programs`), you can sign in with:

| Email | Password |
|-------|----------|
| `demo1@wellspring.local` | `Wellspring1!` |
| `demo2@wellspring.local` | `Wellspring1!` |

Each account includes sample programs.

## Troubleshooting

- **Port already in use** — Stop other processes on `3000`, `4443`, `5432`, `8025`, or `9000`/`9001`, or change the mapped ports in `backend/docker-compose.yml` and your env files.
- **Backend env not picked up** — Ensure `backend/.env.local` exists (Docker Compose loads it via `env_file`).
- **Frontend cannot reach API** — Confirm `NEXT_PUBLIC_API_URL` in `frontend/.env` matches the backend URL (default `http://localhost:4443`).
