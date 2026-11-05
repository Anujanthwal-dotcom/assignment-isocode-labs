# Pharmacy Management Platform

A production-oriented, multi-portal pharmacy management system built as a clean TypeScript monorepo with strict regulatory compliance, multi-store inventory coordination, and automated order fulfilment.

---

## 1. Project Overview

This platform is engineered to support:

- **Customer Portal**: Prescription upload, digital cart, order tracking, and automated refill reminders.
- **Pharmacist Portal**: Prescription verification, AI-assisted item review, and regulatory schedule sign-offs.
- **Admin & Operations Portal**: Inventory management across 46 pharmacy stores, centralized compliance rule controls, and audit trails.
- **Compliance Engine**: Rigorous enforcement of drug safety schedules (OTC, Schedule H, Schedule H1, Schedule X, and Narcotics) ensuring zero unlawful dispatches.

> [!NOTE]
> This repository is currently in **Phase 0: Project Scaffolding and Infrastructure**. Foundational services, workspace architecture, database connectivity, and health probing are fully functional.

---

## 2. Technology Stack

- **Monorepo**: [pnpm Workspaces](https://pnpm.io/workspaces) (pnpm v12+)
- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), TypeScript
- **Backend**: [NestJS 11](https://nestjs.com/), REST API, [Swagger/OpenAPI](https://swagger.io/)
- **ORM & Database**: [Prisma ORM](https://www.prisma.io/), [PostgreSQL 16](https://www.postgresql.org/)
- **Cache & Queues**: [Redis 7](https://redis.io/) (`ioredis`)
- **Storage**: [MinIO](https://min.io/) (S3-compatible private object storage)
- **Local Mail Testing**: [Mailpit](https://github.com/axllent/mailpit)
- **Containerization**: [Docker Compose](https://docs.docker.com/compose/)

---

## 3. Repository Structure

```text
pharmacy-platform/
│
├── apps/
│   ├── web/                     # Next.js frontend application (port 3000)
│   └── api/                     # NestJS backend application (port 3001)
│
├── packages/
│   ├── shared-types/            # Reusable TypeScript interfaces and health contracts
│   ├── validation/              # Common validation schemas and format validators
│   └── config/                  # Shared base tsconfig and workspace configurations
│
├── infrastructure/
│   └── docker/
│       └── docker-compose.yml   # PostgreSQL, Redis, MinIO, and Mailpit definitions
│
├── docs/
│   └── architecture.md          # In-depth system architecture documentation
│
├── .env.example                 # Environment configuration template
├── .gitignore                   # Multi-tier git exclusion rules
├── .npmrc                       # pnpm configuration
├── package.json                 # Monorepo root scripts
├── pnpm-workspace.yaml          # pnpm workspace definition and build policies
└── README.md                    # Project documentation (this file)
```

---

## 4. Prerequisites

Ensure the following tools are installed on your workstation:

- **Node.js**: `v20+` or `v26+`
- **pnpm**: `v12+`
- **Docker**: `20.10+` and **Docker Compose** `v2+`

---

## 5. Installation Instructions

1. **Clone and enter the workspace:**

   ```bash
   cd assignment-isocode
   ```

2. **Install all dependencies:**

   ```bash
   pnpm install
   ```

3. **Approve required build scripts (if prompted by pnpm v12+):**
   ```bash
   pnpm approve-builds --all
   ```

---

## 6. Environment Configuration

Copy the `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

Key environment variables:

| Variable                       | Consumed By | Purpose                                    | Default                             |
| :----------------------------- | :---------- | :----------------------------------------- | :---------------------------------- |
| `NODE_ENV`                     | Global      | Runtime environment                        | `development`                       |
| `PORT`                         | `apps/api`  | Backend HTTP listening port                | `3001`                              |
| `CORS_ORIGIN`                  | `apps/api`  | Allowed frontend origin for CORS           | `http://localhost:3000`             |
| `NEXT_PUBLIC_API_URL`          | `apps/web`  | Public backend URL accessible from browser | `http://localhost:3001`             |
| `DATABASE_URL`                 | `apps/api`  | PostgreSQL connection string               | `postgresql://...:5432/pharmacy_db` |
| `REDIS_HOST`, `REDIS_PORT`     | `apps/api`  | Redis connection details                   | `localhost`, `6379`                 |
| `MINIO_ENDPOINT`, `MINIO_PORT` | `apps/api`  | MinIO S3 API connection details            | `localhost`, `9000`                 |
| `MAIL_HOST`, `MAIL_SMTP_PORT`  | `apps/api`  | Mailpit SMTP connection details            | `localhost`, `1025`                 |

---

## 7. Docker Infrastructure Commands

Start all infrastructure containers (PostgreSQL, Redis, MinIO, Mailpit):

```bash
pnpm infra:up
```

View real-time logs from infrastructure containers:

```bash
pnpm infra:logs
```

Stop infrastructure containers without deleting persistent volumes:

```bash
pnpm infra:down
```

---

## 8. Database Setup

Once PostgreSQL is running via `pnpm infra:up`:

1. **Generate Prisma Client:**

   ```bash
   pnpm --filter @pharmacy/api prisma:generate
   ```

2. **Database Models & Migrations:**
   Per Phase 0 design rules, no business or application models are defined in this phase. The backend verifies database connectivity via raw SQL query (`SELECT 1`). All business models (`User`, `Store`, `Medicine`, etc.) and database migrations will be introduced in Phase 1.

---

## 9. Running the Applications

### Run both Frontend and Backend concurrently:

```bash
pnpm dev
```

### Run only Frontend (Next.js):

```bash
pnpm dev:web
```

### Run only Backend (NestJS):

```bash
pnpm dev:api
```

---

## 10. Service Endpoints & URLs

| Service / Tool           | URL                                                                        | Description                                                     |
| :----------------------- | :------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| **Frontend Portal**      | [http://localhost:3000](http://localhost:3000)                             | Landing & environment status page                               |
| **Backend API Gateway**  | [http://localhost:3001/api/v1](http://localhost:3001/api/v1)               | Base REST API route                                             |
| **Health Check**         | [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health) | Live API & backing dependency status                            |
| **Swagger OpenAPI Docs** | [http://localhost:3001/api/docs](http://localhost:3001/api/docs)           | Interactive API documentation                                   |
| **MinIO Console**        | [http://localhost:9001](http://localhost:9001)                             | S3 storage dashboard (`minio_admin` / `minio_admin_secret_key`) |
| **Mailpit Mailbox**      | [http://localhost:8025](http://localhost:8025)                             | Webmail viewer for transactional email testing                  |

---

## 11. Health Check Endpoint Details

Endpoint: `GET /api/v1/health`

### Response (200 OK):

```json
{
  "status": "ok",
  "service": "pharmacy-api",
  "timestamp": "2026-11-05T06:00:00.000Z",
  "dependencies": {
    "database": "ok",
    "redis": "ok"
  }
}
```

If PostgreSQL or Redis is offline, the endpoint responds with HTTP `503 Service Unavailable` with degraded status details.

---

## 12. Code Quality & Build Commands

- **Build all applications and packages:**
  ```bash
  pnpm build
  ```
- **Type-check entire monorepo:**
  ```bash
  pnpm typecheck
  ```
- **Lint all applications:**
  ```bash
  pnpm lint
  ```
- **Format codebase:**
  ```bash
  pnpm format
  ```
- **Check code formatting:**
  ```bash
  pnpm format:check
  ```
