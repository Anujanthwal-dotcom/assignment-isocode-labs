# Known Limitations and Production Considerations

This document outlines architectural assumptions, simulated integrations, and technical considerations for running the platform in development vs production.

---

## 1. Simulated External Integrations

### 1.1 Mock AI Prescription Reader

- **Current State**: Uses a deterministic mock provider (`MockPrescriptionReader`) and optional LangChain structured prompt adapter.
- **Production Path**: In production, configure Google Cloud Vertex AI (Gemini 1.5 Pro) or AWS Textract Medical with OCR preprocessing. The application boundary remains invariant: AI outputs are always treated as drafts and require explicit pharmacist review.

### 1.2 Simulated Payment Provider

- **Current State**: Uses an in-app UPI simulator and COD flow (`PaymentSimulator`). Payment webhooks and callbacks are processed via local endpoints.
- **Production Path**: Integrate Razorpay or Cashfree webhooks with HMAC SHA-256 signature verification and asynchronous webhook event logs.

### 1.3 Mock SMS OTP Provider

- **Current State**: OTPs are generated and returned in development responses (or default to `123456`) and stored as SHA-256 hashes in Redis/PostgreSQL.
- **Production Path**: Connect an SMS gateway (e.g. Gupshup, Twilio, or MSG91) via DLT-approved templates for transactional medicine alerts.

### 1.4 Object Storage (MinIO vs S3)

- **Current State**: Local S3-compatible MinIO container running on ports `9000` / `9001`.
- **Production Path**: Transition to AWS S3 or Google Cloud Storage with customer-managed KMS keys for at-rest prescription file encryption.

---

## 2. Fulfilment and Store Routing Assumptions

- **Single Store Fulfilment**: The routing engine routes the complete order to the nearest eligible store with complete stock. It does **not** split an order across multiple stores to prevent partial deliveries and fractured regulatory chain of custody.
- **Fixed Radius**: Store proximity is calculated via the Haversine formula based on geocoded coordinates. Production systems would incorporate live road distance matrix APIs (e.g. Google Distance Matrix) and store delivery polygons.

---

## 3. Regulatory Safety Boundaries

- **Schedule X & Narcotics**: Hard-blocked by default in code and database compliance policies. Any attempt to cart or order Schedule X medicines returns a `422 Unprocessable Entity`.
- **H1 Register Dispensing Trigger**: H1 register records are written strictly at physical handover/dispensing (`HANDED_OVER`), not during order creation or verification.
