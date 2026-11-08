# Demonstration and Operational Guide

This operational guide details the complete end-to-end scenarios for demonstrating the multi-store pharmacy platform across all four user portals.

---

## 1. Demo Credentials & Store Network

### Seed User Accounts

| Portal | Role | Email | Password | Assigned Scope / Store |
| :--- | :--- | :--- | :--- | :--- |
| **Customer 1** | `CUSTOMER` | `customer@example.com` | `DemoPassword123!` (OTP: `123456`) | Debasish Ghosh (Salt Lake Sector 1, Kolkata) |
| **Customer 2** | `CUSTOMER` | `customer2@example.com` | `DemoPassword123!` (OTP: `123456`) | Rina Sen (Howrah Maidan, Howrah) |
| **Pharmacist** | `PHARMACIST` | `pharmacist@example.com` | `DemoPassword123!` | Global Clinical Reviewer (Platform-Wide) |
| **Store Staff (Salt Lake)** | `STORE_STAFF` | `staff.saltlake@example.com` | `DemoPassword123!` | Salt Lake Store (`KOL-001`) |
| **Store Staff (Howrah)** | `STORE_STAFF` | `staff.howrah@example.com` | `DemoPassword123!` | Howrah Maidan Store (`HOW-001`) |
| **Store Staff (South Kolkata)** | `STORE_STAFF` | `staff.southkolkata@example.com` | `DemoPassword123!` | South Kolkata Store (`SOU-001`) |
| **Admin** | `ADMIN` | `admin@example.com` | `DemoPassword123!` | Platform Operations & Compliance Administrator |

### Kolkata Retail Store Network

| Store Code | Name | Address & Region | Latitude | Longitude |
| :--- | :--- | :--- | :--- | :--- |
| **`KOL-001`** | Salt Lake Store | Block CA, Sector I, Salt Lake, Kolkata | 22.5867 | 88.4178 |
| **`HOW-001`** | Howrah Maidan Store | 42, GT Road, Howrah Maidan, Howrah | 22.5958 | 88.3248 |
| **`SOU-001`** | Jadavpur Store | Central Road, Jadavpur, Kolkata South | 22.4988 | 88.3712 |

---

## 2. Core Demonstration Scenarios

### Scenario 1: Prescription Upload & Asynchronous AI Extraction (Prescription-First Flow)

1. **Sign In as Customer**:
   - Navigate to `http://localhost:3000`.
   - Click **Customer** portal card -> sign in with `customer@example.com` / `DemoPassword123!`.
2. **Upload Scanned Prescription**:
   - Go to **Prescriptions** (`/customer/prescriptions`).
   - Click **"Upload Prescription"**.
   - Select patient profile: "Debasish Ghosh (Self)" or "Maya Ghosh (Mother)".
   - Attach prescription scan (`Dr-Mukherjee-Rx-Debasish.jpg` or any image/PDF).
   - Click **"Upload & Analyze Prescription"**.
3. **Observe AI Vision Extraction**:
   - Status transitions to `UNDER_REVIEW`.
   - Background BullMQ job dispatches the image to Gemini 1.5 Flash.
   - Prescriber name, date, and medicines (`Amoxicillin 500 mg`, `Paracetamol 500 mg`) are extracted into structured candidate items.
4. **Invariant Check**:
   - Open **My Orders** (`/customer/orders`).
   - Notice that **zero orders exist** for this prescription.
   - The prescription is safely queued for clinical review without phantom order generation.

---

### Scenario 2: Central Pharmacist Clinical Review & Quotation Generation

1. **Sign In as Pharmacist**:
   - Navigate to `http://localhost:3000`.
   - Click **Pharmacist** card -> log in with `pharmacist@example.com` / `DemoPassword123!`.
2. **Review Queue**:
   - Open `/pharmacist/review-queue`.
   - Under the primary tab **"Prescriptions Awaiting Review"**, locate Debasish's newly uploaded prescription.
   - Click **"Verify & Quote →"**.
3. **Side-by-Side Document & Catalogue Verification**:
   - View the secure scanned image in the document viewer.
   - Review AI detections side-by-side with matched active catalogue medicines and live store availability.
   - Adjust dosage instructions or substitute items if necessary.
4. **Generate & Send Quotation**:
   - Click **"Generate & Send Quotation to Customer"**.
   - The prescription status transitions to `QUOTED`.
   - Total amount is calculated based on standard retail pricing.
   - Still, **no order exists yet** until customer review and payment.

---

### Scenario 3: Customer Quotation Review, Delivery Address Selection & Multi-Store Split Ordering

1. **Customer Views Verified Quotation**:
   - Switch back to customer session at `http://localhost:3000/customer/prescriptions`.
   - Open the quoted prescription.
   - Observe the green badge: **"Verified Quotation Ready"**.
   - Review exact medicines, quantities, and line totals approved by the pharmacist.
2. **Select Delivery & Complete Bundle Payment**:
   - Select Delivery Address: `Plot 45, Sector I, Salt Lake, Kolkata (700064)`.
   - Select Payment Method: `UPI` or `Cash on Delivery (COD)`.
   - Click **"Accept Quotation & Pay Now (₹98.00)"**.
3. **Nearest-Store Dynamic Auto-Routing & Order Creation**:
   - The backend computes the Haversine distance from the Salt Lake delivery address to nearby stores:
     - `KOL-001` (Salt Lake): ~0.8 km (Nearest)
     - `HOW-001` (Howrah): ~11.2 km
     - `SOU-001` (Jadavpur): ~12.5 km
   - **Case A (Single Store Complete Stock)**: If `KOL-001` has all items, a single order is created assigned to `KOL-001`.
   - **Case B (Multi-Store Split Fulfilment)**: If stock is divided (e.g. Amoxicillin at `KOL-001`, Paracetamol only at `HOW-001`), the engine automatically creates **two child orders** sharing the single bundle payment.
4. **Customer Confirmation**:
   - Customer sees order summary with split shipment packages, store attribution badges, and shipment tracking links.

---

### Scenario 4: Store Staff Daily CSV Inventory Injection with 2-Step Schema Verification

1. **Sign In as Store Staff**:
   - Navigate to `http://localhost:3000`.
   - Click **Store Staff** card -> log in with `staff.saltlake@example.com` / `DemoPassword123!`.
   - Observe store lock badge in header: `Target Store: Salt Lake Store (KOL-001)`.
2. **Download Daily Store Template**:
   - Navigate to **Daily CSV Injection** (`/staff/inventory/import`).
   - Click **"Download Store Template (.csv)"** to retrieve the exact 3-column format:
     ```csv
     sku,quantity,reorderLevel
     MED-AMX-500-001,150,20
     MED-PAR-500-002,250,30
     MED-TEL-40-001,80,15
     ```
3. **Step 1: Schema-First Validation**:
   - Drag and drop or browse the CSV file.
   - The UI automatically calls `POST /inventory/imports/validate` **before** any database mutation.
   - If invalid headers or negative quantities are injected, exact row errors are displayed and processing is blocked.
   - When valid, a green checkmark appears: `✓ CSV Schema Check Passed`.
4. **Step 2: Process & Apply**:
   - Click **"Process & Inject into Salt Lake Store"**.
   - Inventory balances for `KOL-001` are updated atomically in PostgreSQL.
   - Navigate to **Live Store Inventory** (`/staff/inventory`) to see the updated on-hand counts.

---

### Scenario 5: Store Staff Local Fulfilment (Pick, Pack & Handover)

1. **Staff Fulfilment Queue**:
   - As `staff.saltlake@example.com`, open **Store Fulfilment** (`/staff/fulfilment`).
   - Locate the order package assigned to Salt Lake Store.
   - Click **"Pick & Pack"**.
2. **Picking**:
   - Verify physical item on shelf against catalogue SKU.
   - Confirm quantity picked.
3. **Packing & Invoicing**:
   - Enter package box count and security seal tag.
   - Download generated tax invoice.
4. **Handover**:
   - Select courier partner (e.g. `Shadowfax Express`, Tracking: `SWIFT-77821`).
   - Complete handover.
   - Status updates to `HANDED_OVER`; physical on-hand stock is deducted.

---

## 3. Statutory Drug Compliance Verification

1. **Schedule H / H1 Restrictions**:
   - Any order containing Schedule H1 medicines (e.g. `Alprazolam 0.5 mg`, SKU: `MED-ALP-05-001`) automatically requires mandatory prescriber registration and generates an immutable record in `H1RegisterEntry`.
2. **Prohibited Categories**:
   - Schedule X items and Narcotics are permanently blocked from cart addition and quotation generation under platform compliance policy.
