/**
 * Deterministic preview data for Pharmacy Platform.
 * Strictly local, static, and illustrative.
 */

export const SAMPLE_CUSTOMER = {
  name: 'Debasish Ghosh',
  email: 'debasish.ghosh@example.com',
  phone: '+91 98300 12345',
  activeProfile: 'Mother',
  familyMembers: [
    { id: 'fm-1', name: 'Debasish Ghosh (Self)', relation: 'Self' },
    { id: 'fm-2', name: 'Mother (Protima Ghosh)', relation: 'Mother' },
    { id: 'fm-3', name: 'Father (Bimal Ghosh)', relation: 'Father' },
  ],
  upcomingRefill: {
    medicineName: 'Telmisartan 40 mg',
    dosage: '1 tablet daily after breakfast',
    remainingDoses: 5,
    dueDate: '2026-11-10',
    scheduleType: 'Schedule H',
    prescribedBy: 'Dr. S. Mukherjee (Cardiologist)',
  },
  recentOrders: [
    {
      id: 'RX-50214',
      date: '2026-11-04',
      items: 'Telmisartan 40 mg, Metformin 500 mg',
      total: '₹ 480.00',
      status: 'pending' as const,
      statusLabel: 'Verification Pending',
      store: 'Salt Lake',
    },
    {
      id: 'RX-49811',
      date: '2026-10-22',
      items: 'Amlodipine 5 mg, Atorvastatin 10 mg',
      total: '₹ 620.00',
      status: 'completed' as const,
      statusLabel: 'Delivered',
      store: 'Salt Lake',
    },
    {
      id: 'RX-48902',
      date: '2026-10-05',
      items: 'Pantoprazole 40 mg',
      total: '₹ 155.00',
      status: 'completed' as const,
      statusLabel: 'Delivered',
      store: 'Park Street',
    },
  ],
} as const;

export const SAMPLE_PHARMACIST = {
  name: 'Dr. Arindam Sen',
  role: 'Clinical Verification Pharmacist (Reg #WB-PH-84920)',
  storeName: 'Central Clinical Hub',
  storeCode: 'WB-KOL-CENTRAL',
  queueSummary: {
    pendingVerification: 14,
    escalatedCompliance: 3,
    readyForDispatch: 28,
  },
  pendingPrescription: {
    reference: 'RX-50214',
    customerName: 'Debasish Ghosh',
    forPatient: 'Mother (Protima Ghosh, 68y)',
    uploadedAt: '10 minutes ago (11:50 AM)',
    doctorName: 'Dr. S. Mukherjee, MD (Reg #MCI-48201)',
    hospital: 'AMRI Hospitals, Salt Lake',
    diagnosis: 'Essential Hypertension',
    medicines: [
      {
        name: 'Telmisartan 40 mg',
        frequency: '1-0-0 (Morning)',
        duration: '30 Days',
        quantity: 30,
        schedule: 'Schedule H',
        inStock: true,
        availableStock: 240,
        warning: 'Requires valid doctor sign-off within 6 months',
      },
      {
        name: 'Metformin 500 mg',
        frequency: '1-0-1 (Morning & Night)',
        duration: '30 Days',
        quantity: 60,
        schedule: 'Schedule H',
        inStock: true,
        availableStock: 180,
      },
    ],
  },
} as const;

export const SAMPLE_ADMIN = {
  name: 'Ananya Roy',
  role: 'Operations Administrator',
  kpis: [
    {
      title: 'Active Stores',
      value: '46',
      subtext: 'Across 4 regional hubs',
      status: 'neutral' as const,
    },
    {
      title: 'Pending Prescriptions',
      value: '182',
      subtext: 'Across all active store queues',
      status: 'warning' as const,
    },
    {
      title: 'Regulatory Compliance',
      value: '99.8%',
      subtext: 'Schedule H/H1/X compliance rate',
      status: 'success' as const,
    },
    {
      title: 'Dispatch SLA',
      value: '42 mins',
      subtext: 'Average intake-to-dispatch time',
      status: 'information' as const,
    },
  ],
  recentOrdersTable: [
    {
      id: 'RX-50214',
      store: 'Salt Lake',
      customer: 'Debasish Ghosh',
      schedule: 'Schedule H',
      itemsCount: 2,
      status: 'pending' as const,
      timestamp: '11:50 AM',
    },
    {
      id: 'RX-50213',
      store: 'New Town',
      customer: 'Priya Sharma',
      schedule: 'Schedule H1',
      itemsCount: 1,
      status: 'blocked' as const,
      timestamp: '11:42 AM',
    },
    {
      id: 'RX-50212',
      store: 'Ballygunge',
      customer: 'Amitav Das',
      schedule: 'General Rx',
      itemsCount: 4,
      status: 'completed' as const,
      timestamp: '11:35 AM',
    },
    {
      id: 'RX-50211',
      store: 'Salt Lake',
      customer: 'Sunita Banerjee',
      schedule: 'Schedule H',
      itemsCount: 3,
      status: 'processing' as const,
      timestamp: '11:28 AM',
    },
  ],
} as const;
