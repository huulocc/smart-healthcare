export type AdminStatus = 'Confirmed' | 'Available' | 'Active' | 'Completed' | 'Paid' | 'Pending' | 'Waiting' | 'In Progress' | 'Cancelled' | 'Failed' | 'Flagged' | 'Processing' | 'Inactive' | 'On Leave' | 'Off Duty' | 'In Consultation' | 'Low';

export const adminImages = {
  admin: 'https://images.pexels.com/photos/12311559/pexels-photo-12311559.jpeg?auto=compress&cs=tinysrgb&w=120',
  doctor1: '/images/doctor_1.jpg',
  doctor2: '/images/doctor_2.jpg',
  doctor3: '/images/doctor_3.jpg',
  patient1: 'https://images.pexels.com/photos/23496671/pexels-photo-23496671.jpeg?auto=compress&cs=tinysrgb&w=120',
  patient2: 'https://images.pexels.com/photos/35753740/pexels-photo-35753740.jpeg?auto=compress&cs=tinysrgb&w=120',
  patient3: 'https://images.pexels.com/photos/8727573/pexels-photo-8727573.jpeg?auto=compress&cs=tinysrgb&w=120',
};

export const dashboardAppointments = [
  { patient: 'Emma Williams', patientId: 'PT-10284', patientImage: adminImages.patient1, doctor: 'Dr. Sophia Chen', doctorImage: adminImages.doctor2, department: 'Cardiology', time: 'Today, 09:30 AM', type: 'Follow-up', status: 'Confirmed' as AdminStatus },
  { patient: 'Robert Davis', patientId: 'PT-09461', patientImage: adminImages.patient2, doctor: 'Dr. James Wilson', doctorImage: adminImages.doctor1, department: 'Neurology', time: 'Today, 10:00 AM', type: 'Consultation', status: 'Waiting' as AdminStatus },
  { patient: 'Olivia Martin', patientId: 'PT-08602', patientImage: adminImages.patient3, doctor: 'Dr. Maya Patel', doctorImage: adminImages.doctor2, department: 'Pediatrics', time: 'Today, 11:15 AM', type: 'Check-up', status: 'In Progress' as AdminStatus },
  { patient: 'Noah Thompson', patientId: 'PT-07519', patientImage: adminImages.patient1, doctor: 'Dr. Daniel Kim', doctorImage: adminImages.doctor3, department: 'Dermatology', time: 'Today, 01:45 PM', type: 'Consultation', status: 'Confirmed' as AdminStatus },
];

export const doctorAvailability = [
  { name: 'Dr. Sophia Chen', specialty: 'Cardiology', status: 'Available' as AdminStatus, image: adminImages.doctor2 },
  { name: 'Dr. James Wilson', specialty: 'Neurology', status: 'In Consultation' as AdminStatus, image: adminImages.doctor1 },
  { name: 'Dr. Maya Patel', specialty: 'Pediatrics', status: 'Available' as AdminStatus, image: adminImages.doctor2 },
  { name: 'Dr. Daniel Kim', specialty: 'Dermatology', status: 'Off Duty' as AdminStatus, image: adminImages.doctor3 },
];

export const departmentLoad = [
  { name: 'Cardiology', value: 82 },
  { name: 'Neurology', value: 67 },
  { name: 'Pediatrics', value: 75 },
  { name: 'Dermatology', value: 56 },
  { name: 'General Medicine', value: 91 },
];

export const recentActivities = [
  { title: 'New patient account created', detail: 'Emma Williams was registered by Admissions.', time: '09:12 AM', color: '#0EA5E9' },
  { title: 'Doctor profile updated', detail: 'Dr. James Wilson updated his availability.', time: '10:04 AM', color: '#10B981' },
  { title: 'Appointment completed', detail: 'Consultation for Olivia Martin was completed.', time: '11:26 AM', color: '#026AA7' },
  { title: 'Payment received', detail: 'Invoice INV-84721 was paid successfully.', time: '12:08 PM', color: '#10B981' },
  { title: 'AI consultation reviewed', detail: 'A flagged consultation was reviewed by an admin.', time: '01:15 PM', color: '#F59E0B' },
];

export type ManagementKey = 'patients' | 'doctors' | 'departments' | 'appointments' | 'payments' | 'ai';

export interface ManagementConfig {
  title: string;
  subtitle: string;
  action?: string;
  stats?: { label: string; value: string; icon: string; tone: string }[];
  filters: string[];
  columns: string[];
  rows: (string | AdminStatus)[][];
  detailTitle: string;
  detail: { label: string; value: string | AdminStatus; status?: boolean }[];
}

export const managementConfigs: Record<ManagementKey, ManagementConfig> = {
  patients: {
    title: 'Patients', subtitle: 'Manage registered patients and healthcare accounts.', action: '+ Add Patient',
    stats: [
      { label: 'Total Patients', value: '12,480', icon: 'users', tone: 'blue' },
      { label: 'New This Month', value: '486', icon: 'user-plus', tone: 'green' },
      { label: 'Active Patients', value: '10,942', icon: 'heart-pulse', tone: 'orange' },
      { label: 'Inactive Patients', value: '1,538', icon: 'user-x', tone: 'red' },
    ],
    filters: ['Status', 'Gender', 'Age Group', 'Registration Date'],
    columns: ['Patient', 'Patient ID', 'Contact', 'Gender', 'Age', 'Registered Date', 'Last Appointment', 'Status'],
    rows: [
      ['Emma Williams', 'PT-10284', 'emma.williams@email.com', 'Female', '34', '12 Jan 2025', '18 Aug 2026', 'Active'],
      ['Robert Davis', 'PT-09461', 'robert.davis@email.com', 'Male', '51', '03 Mar 2025', '20 Aug 2026', 'Active'],
      ['Olivia Martin', 'PT-08602', 'olivia.martin@email.com', 'Female', '29', '19 Mar 2025', '20 Aug 2026', 'Active'],
      ['Noah Thompson', 'PT-07519', 'noah.thompson@email.com', 'Male', '42', '02 Apr 2025', '16 Aug 2026', 'Inactive'],
      ['Ava Wilson', 'PT-07128', 'ava.wilson@email.com', 'Female', '37', '18 Apr 2025', '19 Aug 2026', 'Active'],
    ],
    detailTitle: 'Patient Details',
    detail: [
      { label: 'Name', value: 'Emma Williams' }, { label: 'Patient ID', value: 'PT-10284' }, { label: 'Date of birth', value: '14 May 1992' }, { label: 'Gender', value: 'Female' },
      { label: 'Phone', value: '+1 (415) 555-0186' }, { label: 'Email', value: 'emma.williams@email.com' }, { label: 'Status', value: 'Active', status: true }, { label: 'Registered', value: '12 Jan 2025' },
    ],
  },
  doctors: {
    title: 'Doctors', subtitle: 'Manage doctors, specialties and account status.', action: '+ Add Doctor',
    stats: [
      { label: 'Total Doctors', value: '128', icon: 'stethoscope', tone: 'blue' }, { label: 'Active Doctors', value: '116', icon: 'circle-check', tone: 'green' },
      { label: 'Available Doctors', value: '72', icon: 'calendar-check', tone: 'orange' }, { label: 'On Leave', value: '12', icon: 'calendar-x', tone: 'red' },
    ],
    filters: ['Department', 'Specialty', 'Availability', 'Account Status'],
    columns: ['Doctor', 'Doctor ID', 'Department', 'Specialty', 'Contact', 'Experience', 'Availability', 'Status'],
    rows: [
      ['Dr. Sophia Chen', 'DR-00317', 'Cardiology', 'Interventional Cardiology', 'sophia.chen@smarthealthcare.com', '12 years', 'Available', 'Active'],
      ['Dr. James Wilson', 'DR-00276', 'Neurology', 'Clinical Neurology', 'james.wilson@smarthealthcare.com', '15 years', 'Available', 'Active'],
      ['Dr. Maya Patel', 'DR-00231', 'Pediatrics', 'General Pediatrics', 'maya.patel@smarthealthcare.com', '9 years', 'Available', 'Active'],
      ['Dr. Daniel Kim', 'DR-00198', 'Dermatology', 'Clinical Dermatology', 'daniel.kim@smarthealthcare.com', '10 years', 'On Leave', 'Active'],
      ['Dr. Sarah Jenkins', 'DR-00172', 'General Medicine', 'Internal Medicine', 'sarah.jenkins@smarthealthcare.com', '14 years', 'Available', 'Active'],
    ],
    detailTitle: 'Doctor Profile',
    detail: [
      { label: 'Name', value: 'Dr. Sophia Chen' }, { label: 'Doctor ID', value: 'DR-00317' }, { label: 'Department', value: 'Cardiology' }, { label: 'Specialty', value: 'Interventional Cardiology' },
      { label: 'Contact', value: '+1 (415) 555-0124' }, { label: 'Experience', value: '12 years' }, { label: 'Availability', value: 'Available', status: true }, { label: 'Account', value: 'Active', status: true },
    ],
  },
  departments: {
    title: 'Departments', subtitle: 'Manage healthcare departments and doctor assignments.', action: '+ Add Department',
    filters: ['Status', 'Department Head'],
    columns: ['Department', 'Department ID', 'Description', 'Department Head', 'Doctors', 'Appointments', 'Status'],
    rows: [
      ['Cardiology', 'DEP-001', 'Cardiovascular care and treatment', 'Dr. Sophia Chen', '18', '1,842', 'Active'],
      ['Neurology', 'DEP-002', 'Brain and nervous system care', 'Dr. James Wilson', '15', '1,336', 'Active'],
      ['Pediatrics', 'DEP-003', 'Child and infant healthcare', 'Dr. Maya Patel', '21', '1,612', 'Active'],
      ['Dermatology', 'DEP-004', 'Skin, hair and nail treatment', 'Dr. Daniel Kim', '12', '908', 'Active'],
      ['General Medicine', 'DEP-005', 'Primary and general medical care', 'Dr. Sarah Jenkins', '24', '2,074', 'Active'],
    ],
    detailTitle: 'Department Information',
    detail: [
      { label: 'Department', value: 'Cardiology' }, { label: 'Department ID', value: 'DEP-001' }, { label: 'Description', value: 'Heart and cardiovascular care' }, { label: 'Department head', value: 'Dr. Sophia Chen' },
      { label: 'Active doctors', value: '18' }, { label: 'Appointments', value: '1,842' }, { label: 'Workload', value: '82%' }, { label: 'Status', value: 'Active', status: true },
    ],
  },
  appointments: {
    title: 'Appointments', subtitle: 'Manage patient appointments across all departments.', action: '+ New Appointment',
    stats: [
      { label: "Today's Appointments", value: '246', icon: 'calendar-days', tone: 'blue' }, { label: 'Upcoming', value: '189', icon: 'calendar-clock', tone: 'green' },
      { label: 'Completed', value: '42', icon: 'circle-check', tone: 'orange' }, { label: 'Cancelled', value: '15', icon: 'calendar-x', tone: 'red' },
    ],
    filters: ['Date', 'Department', 'Doctor', 'Appointment Type', 'Status'],
    columns: ['Appointment ID', 'Patient', 'Doctor', 'Department', 'Date', 'Time', 'Type', 'Status', 'Payment'],
    rows: [
      ['APT-20260820-084', 'Emma Williams', 'Dr. Sophia Chen', 'Cardiology', '20 Aug 2026', '09:30 AM', 'Follow-up', 'Confirmed', 'Paid'],
      ['APT-20260820-085', 'Robert Davis', 'Dr. James Wilson', 'Neurology', '20 Aug 2026', '10:00 AM', 'Consultation', 'Waiting', 'Paid'],
      ['APT-20260820-086', 'Olivia Martin', 'Dr. Maya Patel', 'Pediatrics', '20 Aug 2026', '11:15 AM', 'Check-up', 'In Progress', 'Paid'],
      ['APT-20260820-087', 'Noah Thompson', 'Dr. Daniel Kim', 'Dermatology', '20 Aug 2026', '01:45 PM', 'Consultation', 'Confirmed', 'Pending'],
      ['APT-20260820-088', 'Ava Wilson', 'Dr. Sarah Jenkins', 'General Medicine', '20 Aug 2026', '02:30 PM', 'Follow-up', 'Completed', 'Paid'],
    ],
    detailTitle: 'Appointment Details',
    detail: [
      { label: 'Appointment ID', value: 'APT-20260820-084' }, { label: 'Patient', value: 'Emma Williams' }, { label: 'Doctor', value: 'Dr. Sophia Chen' }, { label: 'Department', value: 'Cardiology' },
      { label: 'Date & Time', value: '20 Aug 2026, 09:30 AM' }, { label: 'Type', value: 'Follow-up consultation' }, { label: 'Status', value: 'Confirmed', status: true }, { label: 'Payment', value: 'Paid', status: true },
    ],
  },
  payments: {
    title: 'Payments & Billing', subtitle: 'Track healthcare payments, invoices and billing status.',
    stats: [
      { label: 'Total Revenue', value: '$124,860', icon: 'wallet-cards', tone: 'blue' }, { label: 'Revenue This Month', value: '$38,420', icon: 'trending-up', tone: 'green' },
      { label: 'Pending Payments', value: '18', icon: 'clock-3', tone: 'orange' }, { label: 'Failed / Cancelled', value: '6', icon: 'circle-x', tone: 'red' },
    ],
    filters: ['Status', 'Payment Method', 'Date'],
    columns: ['Payment ID', 'Patient', 'Appointment ID', 'Doctor', 'Amount', 'Method', 'Payment Date', 'Status'],
    rows: [
      ['PAY-84721', 'Emma Williams', 'APT-20260820-084', 'Dr. Sophia Chen', '$180.00', 'Credit Card', '20 Aug 2026', 'Paid'],
      ['PAY-84722', 'Robert Davis', 'APT-20260820-085', 'Dr. James Wilson', '$220.00', 'Bank Transfer', '20 Aug 2026', 'Paid'],
      ['PAY-84723', 'Olivia Martin', 'APT-20260820-086', 'Dr. Maya Patel', '$95.00', 'Digital Wallet', '20 Aug 2026', 'Paid'],
      ['PAY-84724', 'Noah Thompson', 'APT-20260820-087', 'Dr. Daniel Kim', '$140.00', 'Credit Card', '20 Aug 2026', 'Pending'],
      ['PAY-84725', 'Ava Wilson', 'APT-20260820-088', 'Dr. Sarah Jenkins', '$110.00', 'Cash', '20 Aug 2026', 'Paid'],
    ],
    detailTitle: 'Payment Details',
    detail: [
      { label: 'Payment ID', value: 'PAY-84721' }, { label: 'Patient', value: 'Emma Williams' }, { label: 'Appointment', value: 'APT-20260820-084' }, { label: 'Doctor', value: 'Dr. Sophia Chen' },
      { label: 'Amount', value: '$180.00' }, { label: 'Method', value: 'Credit Card' }, { label: 'Status', value: 'Paid', status: true }, { label: 'Payment date', value: '20 Aug 2026' },
    ],
  },
  ai: {
    title: 'AI Consultation', subtitle: 'Monitor AI-assisted healthcare consultation activity.',
    stats: [
      { label: 'Total AI Consultations', value: '3,842', icon: 'bot', tone: 'blue' }, { label: 'Consultations Today', value: '128', icon: 'activity', tone: 'green' },
      { label: 'Successfully Completed', value: '3,664', icon: 'circle-check', tone: 'orange' }, { label: 'Flagged for Review', value: '24', icon: 'flag', tone: 'red' },
    ],
    filters: ['Status', 'Risk Level', 'AI Service', 'Date'],
    columns: ['Consultation ID', 'Patient', 'Date', 'Input Type', 'AI Service', 'Status', 'Risk Level'],
    rows: [
      ['AI-20260820-198', 'Robert Davis', '20 Aug 2026', 'Text', 'Clinical Assist v2.4', 'Completed', 'Low'],
      ['AI-20260820-199', 'Emma Williams', '20 Aug 2026', 'Text', 'Clinical Assist v2.4', 'Completed', 'Low'],
      ['AI-20260820-200', 'Olivia Martin', '20 Aug 2026', 'Voice', 'Clinical Assist v2.4', 'Processing', 'Low'],
      ['AI-20260820-201', 'Noah Thompson', '20 Aug 2026', 'Text', 'Clinical Assist v2.4', 'Flagged', 'High'],
      ['AI-20260820-202', 'Ava Wilson', '20 Aug 2026', 'Text', 'Clinical Assist v2.4', 'Completed', 'Low'],
    ],
    detailTitle: 'AI Consultation Detail',
    detail: [
      { label: 'Consultation ID', value: 'AI-20260820-198' }, { label: 'Patient', value: 'Robert Davis' }, { label: 'Date & Time', value: '20 Aug 2026, 10:21 AM' }, { label: 'Input', value: 'Text consultation' },
      { label: 'AI Service', value: 'Clinical Assist v2.4' }, { label: 'Recommendation', value: 'Neurology' }, { label: 'Confidence', value: '91%' }, { label: 'Status', value: 'Completed', status: true },
    ],
  },
};

export const accountRows = [
  ['Alex Morgan', 'alex.morgan@smarthealthcare.com', 'Admin', 'Active', '14 Jan 2024', 'Today, 08:14 AM'],
  ['Dr. Sophia Chen', 'sophia.chen@smarthealthcare.com', 'Doctor', 'Active', '07 Feb 2024', 'Today, 07:48 AM'],
  ['Emma Williams', 'emma.williams@email.com', 'Patient', 'Active', '12 Jan 2025', 'Yesterday, 04:12 PM'],
  ['Robert Davis', 'robert.davis@email.com', 'Patient', 'Active', '03 Mar 2025', 'Today, 09:05 AM'],
  ['Noah Thompson', 'noah.thompson@email.com', 'Patient', 'Inactive', '02 Apr 2025', '12 Aug 2026'],
];

export const permissions = ['View Patients', 'Manage Patients', 'View Doctors', 'Manage Doctors', 'Manage Departments', 'Manage Appointments', 'Manage Schedules', 'View Payments', 'Manage Payments', 'View AI Activity', 'View Reports', 'Manage Users', 'Manage Settings'];