# Testing Strategy and Test Suite Documentation

This document describes the testing architecture, test suites, deterministic fixtures, coverage policies, and instructions for executing tests across the Pharmacy Management Platform monorepo.

---

## 1. Test Architecture Overview

The platform uses **Vitest** across the entire TypeScript monorepo, paired with **Supertest** for HTTP API integration testing and **@testing-library/react** for Next.js frontend UI testing.

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Hierarchy                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend Component & Guard Tests (apps/web)                │
│  - Testing Library + Vitest + jsdom                         │
│  - Form validation, role redirects, UI flows                │
├─────────────────────────────────────────────────────────────┤
│  Backend Unit Tests (apps/api/src/**/*.spec.ts)             │
│  - Isolated services, mocked repositories & dependencies    │
│  - Invariants: AI draft boundaries, refill math, compliance │
├─────────────────────────────────────────────────────────────┤
│  Backend Integration / E2E Tests (apps/api/test/**/*.ts)    │
│  - Real PostgreSQL DB, Redis/BullMQ, Supertest HTTP pipeline│
│  - Complete user journeys, concurrency locks, transitions   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Command Reference

All test commands run from the monorepo root:

| Command                 | Scope    | Description                                                                       |
| ----------------------- | -------- | --------------------------------------------------------------------------------- |
| `pnpm test`             | Monorepo | Runs unit tests (frontend & backend) and full backend integration suites          |
| `pnpm test:unit`        | Monorepo | Runs unit tests for `@pharmacy/api` (33 suites) and `@pharmacy/web` (4 suites)    |
| `pnpm test:integration` | API      | Runs all 8 end-to-end integration suites against local PostgreSQL/Redis           |
| `pnpm test:e2e`         | API      | Alias for integration/E2E test suite                                              |
| `pnpm test:coverage`    | API      | Generates V8 code coverage report for all API services, guards, and controllers   |
| `pnpm typecheck`        | Monorepo | Runs TypeScript compiler checks (`tsc --noEmit`) across packages and apps         |
| `pnpm lint`             | Monorepo | Runs ESLint checks across backend and frontend                                    |
| `pnpm build`            | Monorepo | Produces optimized production builds of packages, API (NestJS), and Web (Next.js) |
| `pnpm format:check`     | Monorepo | Verifies Prettier code style conformance across all files                         |

---

## 3. Test Suites & Coverage Matrix

### 3.1 Unit Test Suites (185 Tests across 37 Files)

- **Authentication & Authorization**:
  - `auth.service.spec.ts`: Credentials verification, token issuing, session creation.
  - `otp.service.spec.ts`: Rate-limiting (max 3 per 10m), expiration (5m), SHA-256 hash storage.
  - `token.service.spec.ts`: JWT access token (15m) and refresh token (7d) signing/verification.
  - `roles.guard.spec.ts`: Strict RBAC role enforcement and public route bypass.
- **AI Prescription Reading**:
  - `prescription-ai-invariants.spec.ts`: Asserts AI outputs are drafts, never auto-approve, cannot change regulatory schedules.
  - `mock-prescription-reader.spec.ts`: 12 deterministic fixtures (readable, handwritten, unreadable, unmatched, low confidence, timeout, provider failure, recovery).
- **Compliance & Verification**:
  - `compliance-evaluator.service.spec.ts`: Schedule H/H1 rules, fail-closed policy, Narcotic/Schedule X blocks.
  - `compliance-rule.service.spec.ts`: Rule set versioning, activation, audit records.
  - `pharmacist-verification.service.spec.ts`: Verification approval, line-item rejection, substitution requests.
- **Inventory & Fulfilment**:
  - `csv-parser.service.spec.ts` & `csv-validation.service.spec.ts`: Inventory CSV parsing, row validation, duplicate SKU detection.
  - `inventory-query.service.spec.ts` & `inventory-adjustment.service.spec.ts`: Stock balances, audit trail movements.
  - `stock-availability.service.spec.ts` & `store-distance.service.spec.ts`: Nearest store routing, stock reservation.
  - `picking.service.spec.ts`, `packing.service.spec.ts`, `handover.service.spec.ts`: Fulfilment state machine.
- **Refills & Analytics**:
  - `refill-calculation.service.spec.ts`: Handover timestamp adherence, unit dosage math, PRN / liquid exclusions.
  - `admin-analytics.service.spec.ts`: Metrics aggregation, median review time calculation.
- **Frontend UI & Guards**:
  - `portal-guards.test.tsx`: Route protection for `/customer`, `/pharmacist`, `/admin`.
  - `auth-forms.test.tsx`: Phone OTP input validation, staff password validation.
  - `customer-ordering-ui.test.tsx`: Catalogue browsing, cart actions, checkout flow.
  - `catalogue-and-inventory-ui.test.tsx`: Inventory listing, CSV upload modal, status badges.

### 3.2 Integration & E2E Suites (85 Tests across 8 Files)

| Suite File                                | Tests | Scenarios Covered                                                                                                                                  |
| ----------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.e2e-spec.ts`                        | 16    | Phone OTP login, staff password login, refresh token rotation, logout, unauthorized access                                                         |
| `catalogue-inventory.e2e-spec.ts`         | 17    | Catalogue creation, CSV stock import, duplicate detection, atomic rollback, negative stock rejection                                               |
| `customer-ordering.e2e-spec.ts`           | 14    | Scenarios A, B, C: Metformin ordering, family profile selection, prescription upload, isolated carts, failed payment retry, prescription re-upload |
| `prescription-ai.e2e-spec.ts`             | 8     | Async BullMQ AI job execution, catalogue matching, low-confidence flag, audit logging                                                              |
| `compliance-and-verification.e2e-spec.ts` | 10    | Review queue, line-item approval/rejection, Schedule X block, pharmacist store boundary, generic alternative consent                               |
| `fulfilment.e2e-spec.ts`                  | 8     | Nearest store routing, picking, packing, handover decrement, H1 register entry creation, customer invoice download                                 |
| `refills-and-analytics.e2e-spec.ts`       | 8     | Dispensing trigger, refill estimate calculation, reminder opt-in/pause, one-tap reorder cart prep, analytics aggregation                           |
| `concurrency-and-integrity.e2e-spec.ts`   | 4     | Race condition stock reservation (no overselling), duplicate payment idempotency, duplicate handover block, OTP brute-force throttle               |

---

## 4. Deterministic Test Fixtures

- **Mock AI Provider**:
  - Deterministic triggers keyed by filename (`handwritten.png`, `unreadable.png`, `low-confidence.png`, `unknown-medicine.png`, `timeout.png`, `provider-error.png`, `multi-medicine.png`).
  - No network calls to external LLM providers during automated runs.
- **Mock Payment Simulator**:
  - Deterministic callback simulation (`MOCK_UPI` and `COD`).
  - Callback endpoint `POST /api/v1/payments/mock/callback` handles status updates and idempotency keys.
- **Test Database & Isolation**:
  - Uses Dockerized PostgreSQL (`pharmacy_db`) and Redis.
  - Seed script provides baseline data (`pnpm --filter @pharmacy/api prisma:seed`).
  - Tests create uniquely suffixed test records (e.g. `phone: 98${random}`) and clean up artifacts in `afterAll` hooks.

---

## 5. Running Tests in Local Environment

### Prerequisites

```bash
# 1. Start required infrastructure containers
pnpm infra:up

# 2. Run Prisma migrations and seed baseline data
pnpm --filter @pharmacy/api prisma:migrate:dev
pnpm --filter @pharmacy/api prisma:seed
```

### Execution

```bash
# Run all unit tests
pnpm test:unit

# Run all integration tests
pnpm test:integration

# Run entire test suite
pnpm test
```
