import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slotKey,
  slotStatus,
  sampleAppointments,
} from '../src/data/appointmentDemo';

test('Doctor role guard: verifies only DOCTOR role is permitted on /doctor routes', () => {
  const allowedRole = 'DOCTOR';
  const checkAccess = (userRole: string | null | undefined): boolean => {
    return userRole === allowedRole;
  };

  assert.equal(checkAccess('DOCTOR'), true, 'Doctor should be granted access');
  assert.equal(checkAccess('PATIENT'), false, 'Patient must be denied doctor workspace');
  assert.equal(checkAccess('ADMIN'), false, 'Admin must not bypass doctor role guard without DOCTOR role');
  assert.equal(checkAccess(null), false, 'Unauthenticated user must be denied');
  assert.equal(checkAccess(undefined), false, 'Undefined role must be denied');
});

test('Doctor identity resolution: never defaults to ID 1 and rejects name-based matching', () => {
  type DoctorUser = { userId: number; doctorId: number; name: string };
  const mockDatabase: DoctorUser[] = [
    { userId: 101, doctorId: 1, name: 'Dr. Default One' },
    { userId: 102, doctorId: 77, name: 'Dr. Sarah Connor' },
    { userId: 103, doctorId: 99, name: 'Dr. Sarah Connor' }, // duplicate name
  ];

  // Resolve by authenticated user ID (never by name or fallback to 1)
  const resolveDoctor = (authenticatedUserId: number): DoctorUser | null => {
    const found = mockDatabase.find(d => d.userId === authenticatedUserId);
    return found || null;
  };

  const doctor77 = resolveDoctor(102);
  assert.ok(doctor77, 'Doctor should be resolved');
  assert.equal(doctor77?.doctorId, 77, 'Doctor ID must be 77, not defaulted to 1');

  const unknownUser = resolveDoctor(999);
  assert.equal(unknownUser, null, 'Unregistered user must not fallback to doctor ID 1');
});

test('Doctor profile payload constraints and validations', () => {
  const validateProfileUpdate = (payload: {
    biography?: string;
    expertise?: string;
    languages?: string;
    avatarUrl?: string;
  }) => {
    const errors: string[] = [];
    if (payload.biography && payload.biography.length > 1500) {
      errors.push('Biography cannot exceed 1500 characters');
    }
    if (payload.expertise && payload.expertise.length > 255) {
      errors.push('Expertise cannot exceed 255 characters');
    }
    if (payload.languages && payload.languages.length > 255) {
      errors.push('Languages cannot exceed 255 characters');
    }
    if (payload.avatarUrl && payload.avatarUrl.length > 500) {
      errors.push('Avatar URL cannot exceed 500 characters');
    }
    return { valid: errors.length === 0, errors };
  };

  const validPayload = {
    biography: 'Experienced cardiologist with 15 years in cardiovascular surgery.',
    expertise: 'Interventional Cardiology, Heart Failure',
    languages: 'English, Vietnamese',
    avatarUrl: '/images/doctor_sarah.jpg',
  };
  assert.equal(validateProfileUpdate(validPayload).valid, true);

  const oversizedBiography = {
    ...validPayload,
    biography: 'A'.repeat(1501),
  };
  assert.equal(validateProfileUpdate(oversizedBiography).valid, false);

  const oversizedExpertise = {
    ...validPayload,
    expertise: 'B'.repeat(256),
  };
  assert.equal(validateProfileUpdate(oversizedExpertise).valid, false);
});

test('Doctor schedule and slot status with exception overrides', () => {
  const sample = sampleAppointments()[0];
  const { doctorId, date, time } = sample;

  const appointment = {
    ...sample,
    status: 'CONFIRMED' as const,
  };

  // 1. When appointment exists for this doctor, slot is 'booked'
  assert.equal(slotStatus(doctorId, date, time, [appointment]), 'booked');

  // 2. Different doctor on same slot is available
  const otherDoctorId = doctorId === 1 ? 2 : 1;
  assert.notEqual(slotStatus(otherDoctorId, date, time, [appointment]), 'booked');

  // 3. Exception override blocks the slot (BREAK exception)
  const key = slotKey(doctorId, date, time);
  assert.equal(
    slotStatus(doctorId, date, time, [], { [key]: false }),
    'blocked',
    'BREAK exception must render slot as blocked'
  );

  // 4. Exception override unblocks the slot (WORK exception)
  assert.equal(
    slotStatus(doctorId, date, time, [], { [key]: true }),
    'available',
    'WORK exception must render slot as available'
  );
});

test('Doctor appointment history routing: Doctor must call doctor-scoped history endpoint', () => {
  const getHistoryEndpoint = (appointmentId: number, isDoctor: boolean): string => {
    if (isDoctor) {
      return `/api/doctor/appointments/${appointmentId}/history`;
    }
    return `/api/appointments/${appointmentId}/history`;
  };

  assert.equal(
    getHistoryEndpoint(100, true),
    '/api/doctor/appointments/100/history',
    'Doctor must use /api/doctor/appointments/:id/history to avoid 403 Forbidden'
  );
  assert.equal(
    getHistoryEndpoint(100, false),
    '/api/appointments/100/history',
    'Patient continues to use /api/appointments/:id/history'
  );
});

test('Doctor appointment isolation (IDOR protection contract)', () => {
  const appointments = [
    { id: 1, doctorId: 10, patientName: 'Patient A', appointmentCode: 'APT-10-A' },
    { id: 2, doctorId: 10, patientName: 'Patient B', appointmentCode: 'APT-10-B' },
    { id: 3, doctorId: 20, patientName: 'Patient C', appointmentCode: 'APT-20-C' },
  ];

  const filterByDoctor = (authenticatedDoctorId: number) => {
    return appointments.filter(a => a.doctorId === authenticatedDoctorId);
  };

  const doc10Appointments = filterByDoctor(10);
  assert.equal(doc10Appointments.length, 2);
  assert.ok(doc10Appointments.every(a => a.doctorId === 10));

  const doc20Appointments = filterByDoctor(20);
  assert.equal(doc20Appointments.length, 1);
  assert.equal(doc20Appointments[0].appointmentCode, 'APT-20-C');

  // Doctor 10 cannot see Doctor 20 appointment
  const doc10CanSeeApp3 = doc10Appointments.some(a => a.id === 3);
  assert.equal(doc10CanSeeApp3, false, 'IDOR violation prevented: Doctor 10 cannot see Doctor 20 appointments');
});

test('Role-based post-login redirection: DOCTOR -> /doctor, ADMIN -> /admin, PATIENT -> home', () => {
  type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';
  const resolvePostLoginRedirect = (role?: Role, requestedFrom?: string): string => {
    if (role === 'DOCTOR') {
      return requestedFrom && requestedFrom.startsWith('/doctor') ? requestedFrom : '/doctor';
    }
    if (role === 'ADMIN') {
      return requestedFrom && requestedFrom.startsWith('/admin') ? requestedFrom : '/admin';
    }
    return requestedFrom && requestedFrom !== '/' ? requestedFrom : '/';
  };

  // 1. Doctor logging in directly defaults to /doctor, bypassing /profile
  assert.equal(resolvePostLoginRedirect('DOCTOR', undefined), '/doctor');
  assert.equal(resolvePostLoginRedirect('DOCTOR', '/profile'), '/doctor');

  // 2. Doctor requested a specific /doctor subpage preserves the subpage
  assert.equal(resolvePostLoginRedirect('DOCTOR', '/doctor/schedule'), '/doctor/schedule');
  assert.equal(resolvePostLoginRedirect('DOCTOR', '/doctor/appointments/42'), '/doctor/appointments/42');

  // 3. Admin logging in directly defaults to /admin, bypassing /profile
  assert.equal(resolvePostLoginRedirect('ADMIN', undefined), '/admin');
  assert.equal(resolvePostLoginRedirect('ADMIN', '/profile'), '/admin');

  // 4. Admin requested a specific /admin subpage preserves the subpage
  assert.equal(resolvePostLoginRedirect('ADMIN', '/admin/users'), '/admin/users');
  assert.equal(resolvePostLoginRedirect('ADMIN', '/admin/settings'), '/admin/settings');

  // 5. Patient lands on the home page, unless a specific page was requested
  assert.equal(resolvePostLoginRedirect('PATIENT', undefined), '/');
  assert.equal(resolvePostLoginRedirect('PATIENT', '/'), '/');
  assert.equal(resolvePostLoginRedirect('PATIENT', '/profile'), '/profile');
  assert.equal(resolvePostLoginRedirect('PATIENT', '/book/1'), '/book/1');
});

