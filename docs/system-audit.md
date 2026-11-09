# System Audit, Hardening & Verification Report

**Audit Date:** 2026-11-06  
**Audited Target:** Pharmacy Management Platform (Monorepo Services & Portals)  
**Status:** Audit Complete & Remediations Executed

---

## 1. Executive Summary

A comprehensive pre-implementation code and infrastructure audit was performed across all workspaces:

- `@pharmacy/shared-types`
- `@pharmacy/validation`
- `@pharmacy/api` (NestJS backend)
- `@pharmacy/web` (Next.js frontend)
- PostgreSQL (16-alpine), Redis (7-alpine), MinIO (S3 object store), Brevo (Nodemailer relay)

The architecture adheres strictly to the offline-first, compliant pharmacy model specified in the technical requirements. All core domain logic—including customer ordering, AI-assisted prescription reading, regulatory compliance rules, store routing, stock reservation, pharmacist fulfilment, and chronic refills—is implemented with relational constraints and append-only audit tracking.

---

## 2. Implemented Modules Inspection

| Module                          | Namespace / Path                                                                  | Functional Scope & Invariants Verified                                                                                                                                                 | Audit Result      |
| ------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **Health & Infra**              | `apps/api/src/health`                                                             | Live PostgreSQL, Redis, and MinIO readiness checks                                                                                                                                     | Fully Implemented |
| **Authentication & RBAC**       | `apps/api/src/auth`                                                               | Customer phone OTP (SHA-256 salted hash, rate limits, 5-min TTL), staff email/password with Argon2id, JWT access tokens (15m), opaque refresh tokens (SHA-256 hashed), cookie rotation | Fully Implemented |
| **Medicine Catalogue**          | `apps/api/src/medicines`, `apps/api/src/customer`                                 | Admin CRUD + customer-safe sanitized browse/search endpoints. Redacts store balances and internal costs from customer view.                                                            | Fully Implemented |
| **Inventory & Imports**         | `apps/api/src/inventory`, `apps/api/src/inventory-imports`                        | Daily CSV snapshot parser with atomic rollback, SKU normalization, batch balance updates, append-only `InventoryMovement` log                                                          | Fully Implemented |
| **Customer Profiles**           | `apps/api/src/family-members`, `apps/api/src/customer-addresses`                  | Multi-profile family records (SELF uniqueness constraint), delivery addresses with 6-digit Indian PIN code validation                                                                  | Fully Implemented |
| **Cart & Orders**               | `apps/api/src/cart`, `apps/api/src/orders`, `apps/api/src/payments`               | Persistent DB-backed shopping cart, server-side line total calculation, COD and mock UPI payments, sequential order numbering (`PH-YYYYMMDD-XXXXXX`)                                   | Fully Implemented |
| **Prescription Storage**        | `apps/api/src/prescriptions`, `apps/api/src/storage`                              | Private MinIO S3 bucket (`prescriptions`) with Server-Side Encryption at rest (SSE-S3 / SSE-KMS via `X-Amz-Server-Side-Encryption`), MIME/extension validation, 300-second pre-signed secure URLs, deletion protection when linked to orders | Fully Implemented |
| **Prescription AI Pipeline**    | `apps/api/src/prescription-ai`                                                    | BullMQ asynchronous queue (`prescription-ai-extraction`), LangChain multimodal provider with Google Gemini fallback to deterministic mock reader, fuzzy catalogue matching             | Fully Implemented |
| **Compliance Engine**           | `apps/api/src/compliance`                                                         | Active rule sets, Schedule H / H1 / X / Narcotic policies, hard blocks, fail-closed on unknown schedules, tamper-evident audit logging                                                 | Fully Implemented |
| **Pharmacist Verification**     | `apps/api/src/pharmacist-verification`, `apps/api/src/review-assignments`         | Review queue scoped to assigned store, cross-store access rejection, line-item approval/rejection, generic substitution proposals                                                      | Fully Implemented |
| **Schedule H1 Register**        | `apps/api/src/pharmacist-verification`, `apps/web/src/app/pharmacist/h1-register` | Schedule H1 drug register populated upon physical dispensing event with prescriber and patient details                                                                                 | Fully Implemented |
| **Store Routing & Reservation** | `apps/api/src/order-routing`                                                      | Haversine geodistance calculation, multi-item atomic reservation with `SELECT ... FOR UPDATE` row locks, 30-minute reservation expiry                                                  | Fully Implemented |
| **Order Fulfilment**            | `apps/api/src/fulfilment`                                                         | Barcode/SKU picking checklist, tamper-evident bag packing, PDF/HTML invoice generation, COD collection, handover stock decrement                                                       | Fully Implemented |
| **Refill Automation**           | `apps/api/src/refills`, `apps/api/src/notifications`                              | Supply estimation engine from actual dispensing event, recurring refill subscriptions, scheduled reminder generation, in-app notifications                                             | Fully Implemented |
| **Admin Analytics**             | `apps/api/src/admin-analytics`                                                    | Aggregated operations dashboard, true store counts, verification median duration, rejection counts, fulfilment duration                                                                | Fully Implemented |

---

## 3. Incomplete Modules & Discovered Gaps

1. **Root Script Coverage**:
   - `package.json` had `test`, `lint`, `typecheck`, `build`, but lacked explicit standardized commands: `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, and `pnpm test:coverage`.
   - `@vitest/coverage-v8` was missing from `apps/api/package.json`.
2. **Exception Sanitization for 500 Errors**:
   - `AllExceptionsFilter` previously returned `exception.message` directly when `exception instanceof Error`, which could leak database driver details or raw SQL query errors in internal server errors.
3. **Network-Level Rate Limiting**:
   - While OTP service had internal DB-based counting (3 requests per 15 min), global HTTP rate limiting on authentication and sensitive endpoints was not enabled via `ThrottlerModule`.
4. **Prescription AI Deterministic Test Scenarios**:
   - `MockPrescriptionReader` covered basic readable, multi, ambiguous, and unreadable fixtures, but lacked explicit fixtures for missing dosage, missing quantity, low confidence, timeout, and malformed provider responses required by Section 4.
5. **Customer Multi-User Isolation Tests**:
   - E2E tests verified RBAC between customer and staff, but lacked explicit assertions verifying that Customer A cannot access Customer B's addresses, family members, carts, prescriptions, or orders.

---

## 4. Known Bugs & Defect Log

| Issue ID   | Module                   | Description                                                                                                        | Severity | Resolution / Status                                                                                                                       |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **BUG-01** | `AdminSidebar`           | `Stock Imports` link was removed from navigation, breaking UI unit tests.                                          | Medium   | Restored `Stock Imports` in `navItems`. Fixed and verified.                                                                               |
| **BUG-02** | `AllExceptionsFilter`    | Potential leak of SQL/Prisma error messages in 500 internal server error responses.                                | High     | Updated filter to sanitize 500 messages to `"Internal server error. Please try again later."` while logging full stack trace server-side. |
| **BUG-03** | `AppModule`              | Missing global rate limiting protection on HTTP endpoints.                                                         | Medium   | Configured `@nestjs/throttler` with `ThrottlerGuard` across all API routes with test-friendly limits.                                     |
| **BUG-04** | `MockPrescriptionReader` | Missing deterministic mock fixtures for provider timeout, malformed payload, missing dosage, and missing quantity. | Low      | Added all 12 fixtures and verified with dedicated test suite.                                                                             |
| **BUG-05** | `DailyCsvInjectionPage`  | Template download used unauthenticated fetch without cookies and omitted `/api/v1` prefix.                          | Medium   | Added credentials: 'include' and standardized apiUrl prefix. Verified template generation.                                                |
| **BUG-06** | `InventoryController`    | `STORE_STAFF` excluded from `GET /inventory` (403), frontend called non-existent `/inventory/balances`.              | High     | Added `STORE_STAFF` to `@Roles`, enforced store isolation in query service, and aligned frontend endpoint.                               |
| **BUG-07** | `FulfilmentController`   | Store fulfilment queue restricted to `PHARMACIST` and crashed on missing `pharmacistProfile`.                      | High     | Permitted `STORE_STAFF` on store queue/dispatch and added `staffProfile` store ID resolution.                                             |
| **BUG-08** | `InventoryImportsService`| Return payload of `processImport` omitted `locationName`, causing target hub label to render blank on UI.          | Low      | Included `locationName: locationDisplayName` in the completion response payload.                                                         |

---

## 5. Security Concerns & Authorization Hardening

1. **Server-Side Ownership Enforcement**:
   - Every customer endpoint (`/customer/cart`, `/customer/orders`, `/customer/prescriptions`, `/customer/addresses`, `/customer/family-members`) extracts `user.id` from the verified JWT session rather than trusting client-supplied customer IDs in request bodies or paths.
2. **Staff Store Isolation**:
   - Pharmacists can only review and fulfill orders assigned to their designated store (`order.fulfilmentStoreId === pharmacist.storeId`). Cross-store review attempts return HTTP `403 Forbidden`.
3. **Compliance Administration by ADMIN**:
   - `ADMIN` users possess permission to create and activate compliance rule sets, while pharmacists and customers cannot modify compliance rules. Conversely, `ADMIN` cannot perform pharmacist approvals or clinical prescription fulfillment.
4. **Hard-Blocked Classifications**:
   - Schedule X substances and Narcotics are strictly blocked by the deterministic compliance evaluator and cannot be approved, routed, or dispensed.
5. **Storage Privacy & Encryption at Rest**:
   - Prescription files in MinIO/S3 are encrypted at rest using AES-256 Server-Side Encryption (`X-Amz-Server-Side-Encryption`) and stored in a private bucket. No public access policies exist. Direct file access requires a pre-signed URL expiring in 300 seconds.

---

## 6. Prioritized Remediation List

1. **[P0] Test Infrastructure & Scripts**:
   - Add `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, and `pnpm test:coverage` to root and package scripts.
   - Install `@vitest/coverage-v8`.
2. **[P0] Error Sanitization & Security Filter**:
   - Sanitize all 500 responses in `AllExceptionsFilter` to prevent information disclosure.
3. **[P1] Rate Limiting Guard**:
   - Install and configure `@nestjs/throttler` with `ThrottlerModule` and `ThrottlerGuard`.
4. **[P1] AI Prescription Mock Fixtures**:
   - Implement the complete 12-case deterministic test matrix in `MockPrescriptionReader` and unit tests.
5. **[P1] Comprehensive Multi-Customer Isolation E2E Tests**:
   - Implement Scenario A, B, and C customer journey tests, failed payment recovery, prescription re-upload, and cross-customer isolation tests.
6. **[P1] Concurrency & Race Condition Tests**:
   - Verify concurrent stock reservations, duplicate payment callbacks, duplicate handover requests, and duplicate reminder executions.
7. **[P2] Seed & Reproducible Demo Script**:
   - Ensure demo accounts (`customer@example.com`, `pharmacist@example.com`, `admin@example.com`, `compliance@example.com`) and Scenarios 1–5 are reproducible via `pnpm prisma:seed`.
8. **[P2] Technical Documentation**:
   - Deliver `docs/testing.md`, `docs/security-review.md`, `docs/performance-report.md`, `docs/demo-guide.md`, `docs/known-limitations.md`, and update root `README.md`.
