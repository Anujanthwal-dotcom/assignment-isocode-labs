# Security and Authorization Hardening Review

This document provides a comprehensive security review of the Pharmacy Management Platform, detailing access control enforcement, customer data isolation, prescription privacy, rate limiting, and error sanitization.

---

## 1. Authentication & Role-Based Access Control (RBAC)

The platform supports 5 distinct user roles:

| Role               | Permitted Portals & Endpoints                                                                               | Prohibitions                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `CUSTOMER`         | `/customer/*`, `/api/v1/customer/*`, `/api/v1/prescriptions/*`                                              | Cannot access pharmacist review queues, fulfilment, inventory, or compliance                                   |
| `PHARMACIST`       | `/pharmacist/*`, `/api/v1/pharmacist/*`, `/api/v1/inventory?storeId=*`, `/api/v1/inventory/imports/*`       | Cannot edit compliance rules, view warehouse stock, or access other stores' fulfilment                         |
| `STORE_STAFF`      | `/staff/*`, `/api/v1/inventory/imports/*`, `/api/v1/inventory?storeId=*`, `/api/v1/pharmacist/fulfilment/*` | Cannot perform clinical pharmacist verification, access central warehouses or other store stock, or edit rules |
| `ADMIN`            | `/admin/*`, `/api/v1/admin/*`, `/api/v1/inventory/*`, `/api/v1/compliance/*`                                | Cannot perform clinical pharmacist approvals or clinical dispensing                                            |
| `COMPLIANCE_ADMIN` | `/admin/compliance/*`, `/api/v1/compliance/*`, `/api/v1/pharmacist/h1-register`                             | Cannot dispense medicines, modify inventory balances, or alter active patient prescriptions                    |

### Authentication & Store Boundary Guard Architecture

- **JWT Auth Guard**: All API endpoints (except `@Public()`) require a valid bearer JWT or `access_token` HttpOnly cookie.
- **Roles Guard**: Verifies that the user role matches `@Roles(...)` metadata.
- **Store Boundary Isolation (`STORE_STAFF`)**: Store staff are cryptographically and relationally locked to their assigned store ID (`userRecord.staffProfile.storeId`). Any attempt to validate CSVs, inject inventory, or query stock balances for other physical stores or central warehouses returns HTTP `403 Forbidden` (`STORE_BOUNDARY_VIOLATION` / `LOCATION_ACCESS_DENIED`).
- **Token Security**: Access tokens are signed JWTs that expire in 15 minutes. Refresh tokens are opaque, stored SHA-256-hashed in Redis as revocable sessions with a 7-day TTL and single-use rotation (`GETDEL`).
- **Demo Credential Environment Gating**: Pre-seeded demo credentials (`customer@example.com`, `pharmacist@example.com`, `admin@example.com`, `compliance@example.com`, `staff.*@example.com`, demo password `DemoPassword123!`, and demo OTP `123456`) are strictly constrained to development mode (`NODE_ENV === 'development'`). Any attempt to authenticate using demo accounts, passwords, or bypass OTPs when `NODE_ENV === 'production'` is rejected with `HTTP 401 Unauthorized` (`DEMO_CREDENTIALS_PROHIBITED_IN_PRODUCTION`). In production, only non-demo registered accounts can authenticate, and OTPs are delivered via live Brevo Nodemailer relay.

---

## 2. Customer Isolation & IDOR Protection

All customer endpoints strictly enforce data ownership:

1. **Cart Isolation**:
   - `cart.service.ts` accesses carts strictly via `prisma.cart.findUnique({ where: { customerUserId: user.id } })`.
   - Customer A cannot view, add to, or clear Customer B's cart.
2. **Prescription Isolation**:
   - `prescriptions.service.ts` checks `prescription.customerUserId === user.id`. Unauthorized access returns `403 Forbidden`.
   - Customer family member access enforces `familyMember.customerUserId === user.id`.
3. **Address Isolation**:
   - Customer addresses check `address.customerUserId === user.id`.
4. **Order Isolation**:
   - `orders.service.ts` ensures customers can only query orders matching `order.customerUserId === user.id`.

---

## 3. Storage Privacy & Prescriptions

Prescriptions contain Protected Health Information (PHI) and sensitive personal data under the DPDP Act 2023. They are encrypted and stored privately:

1. **Server-Side Encryption at Rest (SSE-S3 / SSE-KMS)**:
   - All uploaded prescription files are encrypted before persisting to storage blocks using AES-256 (`X-Amz-Server-Side-Encryption: AES256`) or AWS KMS (`X-Amz-Server-Side-Encryption: aws:kms`).
   - For local development and single-server environments, MinIO is initialized with `MINIO_KMS_SECRET_KEY` providing standalone KMS key hardware simulation.
   - For AWS S3 or GCP Cloud Storage in production, customer-managed KMS key ARNs can be supplied via `MINIO_KMS_KEY_ID` with automated key rotation and CloudTrail auditing.
   - Preserves 100% backward compatibility for browser pre-signed URL streaming (`<img src="..." />` and PDF previews) and asynchronous AI vision workers.
2. **Bucket Configuration**:
   - The MinIO bucket `prescriptions` is configured as **private** (no public read policy).
3. **Signed Download URLs**:
   - Direct object access is blocked. Users must request a short-lived (5 to 15 minutes) signed URL via `GET /api/v1/prescriptions/:id/file-url`.
   - Signed URL generation verifies that the requesting user is either:
     - The customer who owns the prescription.
     - An authorized `PHARMACIST` reviewing the order.
     - An authorized store staff or `ADMIN`.
4. **Audit Trail**:
   - Every prescription view, extraction, and replacement event is logged in the append-only `AuditLog` table.

---

## 4. Rate Limiting & Denial of Service Protection

1. **NestJS Throttler Integration**:
   - Global rate limiter configured via `ThrottlerModule` in `app.module.ts`.
   - Default limit: 120 requests per minute per IP.
2. **Authentication Rate Limits**:
   - OTP generation is limited to **3 requests per 15 minutes** per email address or phone number.
   - 4th consecutive attempt is rejected with `429 Too Many Requests`.
3. **CSV Import Limits**:
   - Inventory import files are restricted to 10 MB and 10,000 rows max to prevent memory exhaustion.

---

## 5. Error Sanitization & Information Leakage Prevention

1. **Global Exception Filter (`all-exceptions.filter.ts`)**:
   - All internal 500-level errors are masked regardless of `NODE_ENV`.
   - Internal error responses return a generic message: `"Internal server error. Please try again later."`
   - Full exception messages and stack traces are written to server logs only.
   - Database connection strings, SQL query errors, Prisma schema names, and stack traces are **never** returned to the HTTP client.
2. **Input Validation**:
   - All controller endpoints use NestJS `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and class-validator DTOs.
   - Prototype pollution and arbitrary property injection are blocked.
