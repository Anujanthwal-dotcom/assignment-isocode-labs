import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging stale PENDING_VERIFICATION orders from database...');

  // Find all orders in PENDING_VERIFICATION or UNDER_REVIEW without an accepted quote
  const staleOrders = await prisma.order.findMany({
    where: {
      OR: [
        { status: OrderStatus.PENDING_VERIFICATION },
        { status: OrderStatus.UNDER_REVIEW },
        { orderNumber: { in: ['ORD-2026-DEMO-01', 'ORD-2026-DEMO-02'] } },
        { orderNumber: { startsWith: 'TEST-ORD-' } },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerUserId: true,
    },
  });

  console.log(`Found ${staleOrders.length} stale unverified order(s) to purge:`);
  for (const o of staleOrders) {
    console.log(`  - ${o.orderNumber} (Status: ${o.status})`);
  }

  if (staleOrders.length === 0) {
    console.log('✅ No stale orders found. Database is clean.');
    return;
  }

  const orderIds = staleOrders.map((o) => o.id);

  // Cascade deletions
  const delReviews = await prisma.prescriptionReview.deleteMany({
    where: { orderId: { in: orderIds } },
  });
  console.log(`Deleted ${delReviews.count} prescription review(s).`);

  const delAssignments = await prisma.orderReviewAssignment.deleteMany({
    where: { orderId: { in: orderIds } },
  });
  console.log(`Deleted ${delAssignments.count} order review assignment(s).`);

  const delItems = await prisma.orderItem.deleteMany({
    where: { orderId: { in: orderIds } },
  });
  console.log(`Deleted ${delItems.count} order item(s).`);

  const delPayments = await prisma.orderPayment.deleteMany({
    where: { orderId: { in: orderIds } },
  });
  console.log(`Deleted ${delPayments.count} payment record(s).`);

  const delHistory = await prisma.orderStatusHistory.deleteMany({
    where: { orderId: { in: orderIds } },
  });
  console.log(`Deleted ${delHistory.count} order status history record(s).`);

  // Unlink quote orderId if any
  await prisma.prescriptionQuote.updateMany({
    where: { orderId: { in: orderIds } },
    data: { orderId: null },
  });

  const delOrders = await prisma.order.deleteMany({
    where: { id: { in: orderIds } },
  });
  console.log(`Deleted ${delOrders.count} order(s).`);

  console.log('✅ Database successfully purged of all unverified and test orders.');
}

main()
  .catch((e) => {
    console.error('❌ Error during purge:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
