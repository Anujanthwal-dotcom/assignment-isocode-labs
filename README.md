# Pharmacy Management Platform

A production-grade, multi-portal pharmacy management platform built as a high-integrity TypeScript monorepo with strict regulatory compliance, multi-store inventory coordination, and automated order fulfilment.

---

## 1. Project Overview & Release Readiness

The platform has reached **Phase 8 (Testing, Hardening & Demonstration)** and is release-ready. It integrates:

- **Customer Portal (`/customer`)**: Medicine catalogue search, prescription upload with private signed URLs, family profiles, checkout with mock UPI/COD, order tracking, and automated refill reminders.
- **Pharmacist Portal (`/pharmacist`)**: Verification queue, private prescription review with AI extraction draft comparison, structured dosage confirmation, Schedule H/H1 regulatory sign-offs, generic substitution proposals, and store fulfilment (pick, pack, handover).
- **Admin & Operations Portal (`/admin`)**: Operations overview, store-level inventory management, atomic CSV stock imports with rollback, review assignment reallocation, and real-time analytics.
- **Compliance Engine (`/admin/compliance`)**: Strict Indian drug regulation enforcement (OTC, Schedule H, Schedule H1, Schedule X, and Narcotics) ensuring zero unlawful dispatches, fail-closed evaluation, and immutable audit logs.
- **AI-Assisted Prescription Reading**: Multimodal extraction pipeline via LangChain with 12 deterministic test fixtures and strict safety boundaries (AI is always a draft; never approves or alters regulatory schedules).

---

## 2. Technology Stack

- **Monorepo Manager**: [pnpm Workspaces](https://pnpm.io/workspaces) (v12+)
- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), Lucide Icons
- **Backend**: [NestJS 11](https://nestjs.com/), REST API, [Swagger/OpenAPI](https://swagger.io/)
- **ORM & Database**: [Prisma ORM 6](https://www.prisma.io/), [PostgreSQL 16](https://www.postgresql.org/)
- **Cache & Async Queues**: [Redis 7](https://redis.io/) (`ioredis`), [BullMQ](https://bullmq.io/)
- **Storage**: [MinIO](https://min.io/) (S3-compatible private object storage with signed URLs)
- **Email Testing**: [Mailpit](https://github.com/axllent/mailpit)
- **Testing & Tooling**: [Vitest 5](https://vitest.dev/), Supertest, React Testing Library, ESLint, Prettier

---

## 3. Repository Structure

```text
pharmacy-platform/
│
├── apps/
│   ├── web/                     # Next.js 15 frontend application (port 3000)
│   └── api/                     # NestJS 11 backend API service (port 3001)
│
├── packages/
│   ├── shared-types/            # Shared TypeScript domain contracts & DTOs
│   ├── validation/              # Shared runtime validation rules & schemas
│   └── config/                  # Shared base tsconfig and compiler settings
│
├── infrastructure/
│   └── docker/
│       └── docker-compose.yml   # PostgreSQL, Redis, MinIO, and Mailpit
│
├── docs/
│   ├── architecture.md          # Architectural blueprints and domain models
│   ├── phase-8-audit.md         # Pre-implementation audit and remediation log
│   ├── testing.md               # Test matrix, execution commands, and fixtures
│   ├── security-review.md       # RBAC matrix, IDOR protection, privacy policies
│   ├── performance-report.md    # Database latency measurements & indexing analysis
│   ├── demo-guide.md            # Step-by-step walkthrough for Demos 1–5
│   └── known-limitations.md     # Offline assumptions and production roadmap
│
├── package.json                 # Monorepo root scripts
└── pnpm-workspace.yaml          # pnpm workspace configuration
```

---

## 4. Quick Start & Prerequisites

Ensure the following tools are installed:

- **Node.js**: `v20+` or `v26+`
- **pnpm**: `v12+`
- **Docker & Docker Compose**

### Installation

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env

# 3. Start backing infrastructure
pnpm infra:up

# 4. Run Prisma database migrations and seed baseline data
pnpm --filter @pharmacy/api prisma:migrate:dev
pnpm --filter @pharmacy/api prisma:seed

# 5. Start development servers
pnpm dev
```

---

## 5. Demonstration Accounts & Scenarios

### Demo Accounts

| Role           | Portal URL          | Login Identifier                | Credential         | Details                       |
| -------------- | ------------------- | ------------------------------- | ------------------ | ----------------------------- |
| **Customer**   | `/customer/login`   | Phone: `9876543210`             | OTP: `123456`      | Debasish Ghosh (Salt Lake)    |
| **Customer 2** | `/customer/login`   | Phone: `9876543211`             | OTP: `123456`      | Rina Sen (Howrah Maidan)      |
| **Pharmacist** | `/pharmacist/login` | Email: `pharmacist@example.com` | `DemoPassword123!` | Store `KOL-001` Pharmacist    |
| **Admin**      | `/admin/login`      | Email: `admin@example.com`      | `DemoPassword123!` | Operations Admin              |
| **Compliance** | `/admin/login`      | Email: `compliance@example.com` | `DemoPassword123!` | Regulatory Compliance Officer |

### Demo Stores

- **`KOL-001`**: Salt Lake Store, Kolkata (Lat: `22.5867`, Lng: `88.4178`)
- **`HOW-001`**: Howrah Maidan Store, Howrah (Lat: `22.5958`, Lng: `88.3248`)
- **`SOU-001`**: Jadavpur Store, Kolkata South (Lat: `22.4988`, Lng: `88.3712`)

_For a full step-by-step walkthrough of Demos 1–5, see [docs/demo-guide.md](file:///home/anuj/Desktop/assignment-isocode/docs/demo-guide.md)._

---

## 6. Verification & Test Commands

| Command                 | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `pnpm test`             | Runs the full test suite across packages, frontend, and backend      |
| `pnpm test:unit`        | Runs all 37 unit test files (185 tests)                              |
| `pnpm test:integration` | Runs all 8 end-to-end integration test suites (85 tests)             |
| `pnpm test:e2e`         | Alias for integration/E2E test suite                                 |
| `pnpm test:coverage`    | Generates V8 code coverage report                                    |
| `pnpm lint`             | Runs ESLint checks across backend and frontend                       |
| `pnpm typecheck`        | Validates TypeScript types across packages and apps (`tsc --noEmit`) |
| `pnpm build`            | Compiles and builds production bundles for Next.js and NestJS        |
| `pnpm format:check`     | Verifies code style compliance using Prettier                        |

---

## 7. Regulatory & Safety Invariants

1. **AI Output Is Always a Draft**: AI cannot approve prescriptions, authorize dispatches, or modify regulatory medicine classifications.
2. **Schedule X & Narcotics Are Hard-Blocked**: Attempts to purchase Schedule X or Narcotic items are permanently blocked (`422 Unprocessable Entity`).
3. **Fail-Closed Compliance**: Any medicine with an unrecognized regulatory schedule cannot be approved or dispatched.
4. **Physical Dispensing Trigger for H1 Register**: Entries in the Schedule H1 register are written strictly upon physical handover (`HANDED_OVER`), capturing patient details, prescriber details, batch numbers, and pharmacist ID.
5. **No Stock Deductions Before Pharmacist Approval**: Stock is reserved only upon pharmacist approval and consumed strictly upon physical handover.
6. **Data Isolation & Private Storage**: Prescriptions are stored privately in MinIO and accessible only via short-lived signed URLs. IDOR controls enforce that customers can only access their own records.

---

## 8. Documentation Index

- [Phase 8 Pre-Implementation Audit](file:///home/anuj/Desktop/assignment-isocode/docs/phase-8-audit.md)
- [Testing Strategy & Test Suite Documentation](file:///home/anuj/Desktop/assignment-isocode/docs/testing.md)
- [Security & Authorization Hardening Review](file:///home/anuj/Desktop/assignment-isocode/docs/security-review.md)
- [Performance & Scalability Report](file:///home/anuj/Desktop/assignment-isocode/docs/performance-report.md)
- [Demonstration & Operational Guide](file:///home/anuj/Desktop/assignment-isocode/docs/demo-guide.md)
- [Known Limitations & Production Roadmap](file:///home/anuj/Desktop/assignment-isocode/docs/known-limitations.md)
- [System Architecture](file:///home/anuj/Desktop/assignment-isocode/docs/architecture.md)
