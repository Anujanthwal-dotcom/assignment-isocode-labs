# Security and Authorization Hardening Review

This document provides a comprehensive security review of the Pharmacy Management Platform, detailing access control enforcement, customer data isolation, prescription privacy, rate limiting, and error sanitization.

---

## 1. Authentication & Role-Based Access Control (RBAC)

The platform supports 5 distinct user roles:

| Role               | Permitted Portals & Endpoints                                                                                              | Prohibitions                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `CUSTOMER`         | `/customer/*`, `/api/v1/customer/*`, `/api/v1/prescriptions/*`                                                             | Cannot access pharmacist review queues, fulfilment, inventory, or compliance                                 |
| `PHARMACIST`       | `/pharmacist/*`, `/api/v1/pharmacist/*`, `/api/v1/inventory?storeId=*`, `/api/v1/inventory/imports/*`                      | Cannot edit compliance rules, view warehouse stock, or access other stores' fulfilment                        |
| `STORE_STAFF`      | `/staff/*`, `/api/v1/inventory/imports/*`, `/api/v1/inventory?storeId=*`, `/api/v1/pharmacist/fulfilment/*`               | Cannot perform clinical pharmacist verification, access central warehouses or other store stock, or edit rules |
| `ADMIN`            | `/admin/*`, `/api/v1/admin/*`, `/api/v1/inventory/*`, `/api/v1/compliance/*`                                             | Cannot perform clinical pharmacist approvals or clinical dispensing                                          |
| `COMPLIANCE_ADMIN` | `/admin/compliance/*`, `/api/v1/compliance/*`, `/api/v1/pharmacist/h1-register`                                            | Cannot dispense medicines, modify inventory balances, or alter active patient prescriptions                  |

### Authentication & Store Boundary Guard Architecture

- **JWT Auth Guard**: All API endpoints (except `@Public()`) require a valid bearer JWT or `access_token` HttpOnly cookie.
- **Roles Guard**: Verifies that the user role matches `@Roles(...)` metadata.
- **Store Boundary Isolation (`STORE_STAFF`)**: Store staff are cryptographically and relationally locked to their assigned store ID (`userRecord.staffProfile.storeId`). Any attempt to validate CSVs, inject inventory, or query stock balances for other physical stores or central warehouses returns HTTP `403 Forbidden` (`STORE_BOUNDARY_VIOLATION` / `LOCATION_ACCESS_DENIED`).
- **Token Security**: Tokens are signed with `JWT_SECRET`, expire in 15 minutes, and refresh tokens are stored hashed in the `Session` table.

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

Prescriptions contain Protected Health Information (PHI) and are stored privately:

1. **Bucket Configuration**:
   - The MinIO bucket `prescriptions` is configured as **private** (no public read policy).
2. **Signed Download URLs**:
   - Direct object access is blocked. Users must request a short-lived (15 minutes) signed URL via `GET /api/v1/prescriptions/:id/view-url`.
   - Signed URL generation verifies that the requesting user is either:
     - The customer who owns the prescription.
     - An authorized `PHARMACIST` reviewing the order.
     - An authorized `ADMIN`.
3. **Audit Trail**:
   - Every prescription view, extraction, and replacement event is logged in the append-only `AuditLog` table.

---

## 4. Rate Limiting & Denial of Service Protection

1. **NestJS Throttler Integration**:
   - Global rate limiter configured via `ThrottlerModule` in `app.module.ts`.
   - Default limit: 120 requests per minute per IP.
2. **Authentication Rate Limits**:
   - OTP generation is limited to **3 requests per 10 minutes** per phone number.
   - 4th consecutive attempt is rejected with `429 Too Many Requests`.
3. **CSV Import Limits**:
   - Inventory import files are restricted to 10 MB and 10,000 rows max to prevent memory exhaustion.

---

## 5. Error Sanitization & Information Leakage Prevention

1. **Global Exception Filter (`all-exceptions.filter.ts`)**:
   - Production mode (`NODE_ENV === 'production'`) completely masks internal 500 errors.
   - Internal error responses return generic message: `"An unexpected internal server error occurred. Please try again later."`
   - Database connection strings, SQL query errors, Prisma schema names, and stack traces are **never** returned to the HTTP client.
2. **Input Validation**:
   - All controller endpoints use NestJS `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and class-validator DTOs.
   - Prototype pollution and arbitrary property injection are blocked.
