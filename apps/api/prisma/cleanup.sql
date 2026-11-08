BEGIN;

-- Temp table of demo user IDs to preserve
CREATE TEMP TABLE demo_users AS
SELECT id FROM users 
WHERE email IN (
  'customer@example.com', 
  'customer2@example.com', 
  'pharmacist@example.com', 
  'admin@example.com', 
  'compliance@example.com', 
  'staff.saltlake@example.com', 
  'staff.howrah@example.com', 
  'staff.southkolkata@example.com'
) OR phone IN ('9876543210', '9876543211');

-- Temp table of non-demo user IDs to delete
CREATE TEMP TABLE non_demo_users AS
SELECT id FROM users WHERE id NOT IN (SELECT id FROM demo_users);

-- Temp table of non-demo order IDs to delete (keep only ORD-2026-DEMO-03)
CREATE TEMP TABLE orders_to_delete AS
SELECT id FROM orders WHERE "orderNumber" != 'ORD-2026-DEMO-03';

-- Temp table of order items to delete
CREATE TEMP TABLE order_items_to_delete AS
SELECT id FROM order_items WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- Delete refill reminders first (references subscriptions, estimates, and notifications)
DELETE FROM refill_reminders 
WHERE "subscriptionId" IN (SELECT id FROM refill_subscriptions WHERE "customerId" IN (SELECT id FROM non_demo_users))
   OR "refillEstimateId" IN (SELECT id FROM refill_estimates WHERE "customerId" IN (SELECT id FROM non_demo_users) OR "orderItemId" IN (SELECT id FROM order_items_to_delete));

-- Delete non-demo refill subscriptions
DELETE FROM refill_subscriptions 
WHERE "customerId" IN (SELECT id FROM non_demo_users)
   OR "refillEstimateId" IN (SELECT id FROM refill_estimates WHERE "orderItemId" IN (SELECT id FROM order_items_to_delete));

-- Delete refill estimates for deleted order items or non-demo users
DELETE FROM refill_estimates 
WHERE "orderItemId" IN (SELECT id FROM order_items_to_delete)
   OR "customerId" IN (SELECT id FROM non_demo_users);

-- Delete customer notifications for non-demo users
DELETE FROM customer_notifications WHERE "customerId" IN (SELECT id FROM non_demo_users);

-- Delete order-item children
DELETE FROM order_item_alternative_proposals WHERE "orderItemId" IN (SELECT id FROM order_items_to_delete);
DELETE FROM order_item_reviews WHERE "orderItemId" IN (SELECT id FROM order_items_to_delete);
DELETE FROM h1_register_entries WHERE "orderItemId" IN (SELECT id FROM order_items_to_delete);
DELETE FROM stock_reservations WHERE "orderItemId" IN (SELECT id FROM order_items_to_delete) OR "orderId" IN (SELECT id FROM orders_to_delete);
DELETE FROM order_item_pickings WHERE "orderItemId" IN (SELECT id FROM order_items_to_delete) OR "orderId" IN (SELECT id FROM orders_to_delete);

-- Delete order children
DELETE FROM order_cod_collections WHERE "orderId" IN (SELECT id FROM orders_to_delete);
DELETE FROM order_handovers WHERE "orderId" IN (SELECT id FROM orders_to_delete);
DELETE FROM invoices WHERE "orderId" IN (SELECT id FROM orders_to_delete);
DELETE FROM order_routing_decisions WHERE "orderId" IN (SELECT id FROM orders_to_delete);
DELETE FROM prescription_reviews WHERE "orderId" IN (SELECT id FROM orders_to_delete);
DELETE FROM order_review_assignments WHERE "orderId" IN (SELECT id FROM orders_to_delete);
DELETE FROM order_status_history WHERE "orderId" IN (SELECT id FROM orders_to_delete);
DELETE FROM order_payments WHERE "orderId" IN (SELECT id FROM orders_to_delete);
UPDATE prescription_quotes SET "orderId" = NULL WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- Delete order items and orders
DELETE FROM order_items WHERE id IN (SELECT id FROM order_items_to_delete);
DELETE FROM orders WHERE id IN (SELECT id FROM orders_to_delete);

-- Prescriptions to preserve
CREATE TEMP TABLE demo_prescriptions AS
SELECT id FROM prescriptions WHERE "objectKey" IN (
  'prescriptions/seed/rx-maya-ghosh-chronic.jpg',
  'prescriptions/seed/rx-debasish-amoxicillin-acute.jpg',
  'prescriptions/seed/rx-rina-sen-alprazolam-h1.jpg',
  'prescriptions/seed/rx-debasish-omeprazole-gastric.jpg',
  'prescriptions/seed/rx-debasish-atorvastatin-cardio.jpg',
  'prescriptions/seed/rx-debasish-cetirizine-derm.jpg'
);

CREATE TEMP TABLE prescriptions_to_delete AS
SELECT id FROM prescriptions WHERE id NOT IN (SELECT id FROM demo_prescriptions);

-- Delete prescription children
DELETE FROM h1_register_entries WHERE "prescriptionId" IN (SELECT id FROM prescriptions_to_delete);
DELETE FROM prescription_reviews WHERE "prescriptionId" IN (SELECT id FROM prescriptions_to_delete);

-- Delete quote items and quotes for non-demo prescriptions
CREATE TEMP TABLE quotes_to_delete AS
SELECT id FROM prescription_quotes 
WHERE "prescriptionId" IN (SELECT id FROM prescriptions_to_delete)
   OR ("orderId" IS NOT NULL AND "orderId" NOT IN (SELECT id FROM orders));

DELETE FROM prescription_quote_items WHERE "quoteId" IN (SELECT id FROM quotes_to_delete);
DELETE FROM prescription_quotes WHERE id IN (SELECT id FROM quotes_to_delete);

DELETE FROM prescription_ai_extractions WHERE "prescriptionId" IN (SELECT id FROM prescriptions_to_delete);
DELETE FROM prescriptions WHERE id IN (SELECT id FROM prescriptions_to_delete);

-- Cart and cart items
DELETE FROM cart_items WHERE "cartId" IN (SELECT id FROM carts WHERE "customerUserId" IN (SELECT id FROM non_demo_users));
DELETE FROM carts WHERE "customerUserId" IN (SELECT id FROM non_demo_users);

-- Family members and addresses
DELETE FROM customer_addresses WHERE "customerUserId" IN (SELECT id FROM non_demo_users);
DELETE FROM family_members WHERE "customerUserId" IN (SELECT id FROM non_demo_users);

-- Profiles & sessions
DELETE FROM customer_profiles WHERE "userId" IN (SELECT id FROM non_demo_users);
DELETE FROM auth_sessions WHERE "userId" IN (SELECT id FROM non_demo_users);
DELETE FROM audit_logs WHERE "actorUserId" IN (SELECT id FROM non_demo_users);

-- Any remaining movements / imports if any:
DELETE FROM inventory_movements WHERE "performedByUserId" IN (SELECT id FROM non_demo_users);
DELETE FROM inventory_imports WHERE "importedByUserId" IN (SELECT id FROM non_demo_users);

-- Finally delete non-demo users
DELETE FROM users WHERE id IN (SELECT id FROM non_demo_users);

COMMIT;
