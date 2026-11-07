# Demonstration and Operational Guide

This guide walks through the 5 core end-to-end scenarios to demonstrate the complete Pharmacy Management Platform.

---

## 1. Demo Credentials & Stores

### User Accounts

| Role                 | Identifier                      | Credential         | Notes                               |
| -------------------- | ------------------------------- | ------------------ | ----------------------------------- |
| **Customer 1**       | Email: `customer@example.com`   | `DemoPassword123!` | Debasish Ghosh (Salt Lake, Kolkata) |
| **Customer 2**       | Email: `customer2@example.com`  | `DemoPassword123!` | Rina Sen (Howrah Maidan)            |
| **Pharmacist**       | Email: `pharmacist@example.com` | `DemoPassword123!` | Licensed Pharmacist (Store KOL-001) |
| **Admin**            | Email: `admin@example.com`      | `DemoPassword123!` | Platform Operations Administrator   |
| **Compliance Admin** | Email: `compliance@example.com` | `DemoPassword123!` | Regulatory Compliance Officer       |

### Demo Stores

- **`KOL-001`**: Salt Lake Store, Kolkata (Lat: 22.5867, Lng: 88.4178)
- **`HOW-001`**: Howrah Maidan Store, Howrah (Lat: 22.5958, Lng: 88.3248)
- **`SOU-001`**: Jadavpur Store, Kolkata South (Lat: 22.4988, Lng: 88.3712)

---

## 2. Demonstration Scenarios

### Scenario 1: Customer Medicine Order & Prescription AI Extraction

1. **Customer Login**:
   - Navigate to `http://localhost:3000/customer/login`.
   - Enter email `customer@example.com` and password `DemoPassword123!`.
2. **Browse & Add to Cart**:
   - Navigate to `http://localhost:3000/customer/medicines`.
   - Search for `Metformin 500 mg` (Schedule H item).
   - Click "Add to Cart".
3. **Upload Prescription & Select Profile**:
   - Go to `http://localhost:3000/customer/cart`.
   - Select family member profile: "Debasish Ghosh (Self)" or "Maya Ghosh (Mother)".
   - Upload prescription image (`tests/fixtures/sample-prescription.png` or any PDF/JPG).
   - Observe upload progress and asynchronous AI extraction draft.
4. **Checkout & Mock Payment**:
   - Proceed to Checkout (`/customer/checkout`).
   - Select address: "Block CA, Sector 1, Salt Lake".
   - Select "Mock UPI Payment" and click Place Order.
   - On the mock payment simulator page (`/customer/payment/mock/[orderId]`), click **"Simulate Success"**.
5. **Expected Outcome**:
   - Order transitions to `UNDER_REVIEW`.
   - Stock is **NOT** yet deducted (compliance verification gate active).
   - Customer can view order status timeline on `/customer/orders/[id]`.

---

### Scenario 2: Pharmacist Compliance Review, Verification & Substitution

1. **Pharmacist Login**:
   - Navigate to `http://localhost:3000/pharmacist/login`.
   - Log in with `pharmacist@example.com` / `DemoPassword123!`.
2. **Review Queue**:
   - Open `/pharmacist/review-queue`.
   - Click "Review" on the newly placed order.
3. **Prescription Verification**:
   - Inspect the private prescription image using the secure signed viewer.
   - Review AI-extracted draft matches and compare against catalogue.
   - Confirm structured dosage (e.g. 1 tablet, 2 times daily, 30 days supply).
   - Approve the line item.
4. **Generic Substitution (Optional Branch)**:
   - If an equivalent cheaper generic is available, pharmacist can click "Propose Alternative".
   - System prompts customer for acceptance before substituting.
5. **Expected Outcome**:
   - Order transitions to `APPROVED`.
   - Audit trail records pharmacist review action with timestamp.
   - Order is automatically queued for store routing and stock reservation.

---

### Scenario 3: Store Routing, Picking, Packing & Handover

1. **Routing & Stock Reservation**:
   - System automatically calculates the nearest eligible store with complete stock (`KOL-001` for Salt Lake customer).
   - 60 units of Metformin are placed into `StockReservation` with `status: ACTIVE`.
   - Order transitions to `STOCK_RESERVED`.
2. **Store Fulfilment Workflow**:
   - Open `/pharmacist/fulfilment`.
   - Locate order and click **"Start Picking"** -> transitions to `PICKING`.
   - Verify SKU barcode and batch number -> click **"Confirm Pick"**.
   - Click **"Pack Order"** -> enter package box count and seal number -> click **"Complete Packing"** -> transitions to `PACKED`.
   - Move order to dispatch shelf -> transitions to `READY_FOR_HANDOVER`.
3. **Physical Handover**:
   - Click **"Handover"** on `/pharmacist/fulfilment/[orderId]/handover`.
   - Select Handover Type: `DELIVERY_PARTNER`.
   - Enter partner name: `Shadowfax Express`, tracking: `SWIFT-100293`.
   - Click **"Confirm Handover"**.
4. **Expected Outcome**:
   - Order transitions to `HANDED_OVER`.
   - Stock is deducted from `InventoryBalance` at `KOL-001`.
   - If medicine is Schedule H1, an entry is automatically written to `H1RegisterEntry`.
   - Customer invoice is generated and accessible via `/customer/orders/[id]/invoice`.

---

### Scenario 4: Refill Reminder Opt-In & One-Tap Reorder

1. **Refill Estimate Generation**:
   - Handover of verified tablet order triggers deterministic calculation:
     - 60 tablets / (1 tablet * 2/day) = **30 days supply**.
     - Estimated run-out date is set to 30 days from handover.
2. **Customer Opt-In**:
   - Customer navigates to `/customer/refills`.
   - Sees Metformin refill estimate with status `ELIGIBLE`.
   - Clicks **"Set Up Refill Reminder"** (remind 5 days before run-out).
   - Refill subscription is now `ACTIVE`.
3. **One-Tap Reorder**:
   - When customer clicks **"Reorder Now"**, the exact dosage and quantity (60 tablets) are added back to the customer's cart.
   - Customer proceeds to checkout without bypassing payment or prescription validation.

---

### Scenario 5: Admin Analytics & Compliance Governance

1. **Admin Login**:
   - Navigate to `http://localhost:3000/admin/login`.
   - Log in with `admin@example.com` / `DemoPassword123!`.
2. **Operational Analytics**:
   - View `/admin/analytics`: Real-time order volume, active subscriptions, revenue.
   - View `/admin/analytics/verification`: Median pharmacist review time, rejection breakdown.
   - View `/admin/inventory`: Live stock balances across all 3 stores.
3. **Compliance Governance**:
   - Log in as `compliance@example.com` / `DemoPassword123!`.
   - Open `/admin/compliance/rules`.
   - View active Rule Set `1.2.0` enforcing Schedule H and H1 mandates.
   - Verify that Schedule X and Narcotic items are permanently blocked from cart/checkout.
