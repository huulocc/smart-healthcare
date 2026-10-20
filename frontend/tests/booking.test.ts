import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  dateKey,
  PRICING,
  sampleAppointments,
  slotKey,
  slotStatus,
  TIMES,
} from '../src/data/appointmentDemo';
import { patientSchema } from '../src/schemas/bookingSchemas';

const patient = {
  bookingFor: 'myself',
  patientName: 'Nguyễn Demo',
  email: 'demo@example.test',
  phone: '+84 900 000 000',
  dob: '',
  reason: '',
  consent: true,
};

test('product date keys remain correct across UTC midnight and month/year boundaries', () => {
  assert.equal(dateKey(new Date('2026-12-31T18:00:00Z')), '2027-01-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('patient schema accepts Vietnamese names and an optional reason', () => {
  assert.equal(patientSchema.safeParse(patient).success, true);
  assert.equal(
    patientSchema.parse({ ...patient, patientName: '  Nguyễn Demo  ' })
      .patientName,
    'Nguyễn Demo',
  );
});

test('invalid contact data and missing consent cannot reach payment', () => {
  for (const changes of [
    { patientName: ' ' },
    { email: 'invalid' },
    { phone: '1234' },
    { phone: '1234567890123456' },
    { consent: false },
  ]) {
    assert.equal(
      patientSchema.safeParse({ ...patient, ...changes }).success,
      false,
    );
  }
});

test('future DOB, impossible calendar dates, and long reasons are rejected', () => {
  for (const changes of [
    { dob: addDays(dateKey(), 1) },
    { dob: '2026-02-30' },
    { reason: 'x'.repeat(501) },
  ]) {
    assert.equal(
      patientSchema.safeParse({ ...patient, ...changes }).success,
      false,
    );
  }
});

test('demo deposits are finite and within the consultation fee', () => {
  assert.ok(Number.isFinite(PRICING.consultationFee));
  assert.ok(PRICING.deposit >= 0 && PRICING.deposit <= PRICING.consultationFee);
});

test('appointments occupy only their own doctor and slot, and cancellation releases it', () => {
  const appointment = sampleAppointments()[0];
  const { doctorId, date, time } = appointment;
  assert.equal(slotStatus(doctorId, date, time, [appointment]), 'booked');
  assert.equal(
    slotStatus(doctorId, date, time, [{ ...appointment, status: 'CANCELLED' }]),
    'available',
  );
  assert.equal(
    slotStatus(doctorId, date, time, [appointment], {}, appointment.id),
    'available',
  );
  assert.notEqual(slotStatus(2, date, time, [appointment]), 'booked');
});

test('doctor availability overrides sync while booked and past slots retain priority', () => {
  const appointment = sampleAppointments()[0];
  const key = slotKey(1, appointment.date, appointment.time);
  assert.equal(
    slotStatus(1, appointment.date, appointment.time, [], { [key]: false }),
    'blocked',
  );
  assert.equal(
    slotStatus(1, appointment.date, appointment.time, [], { [key]: true }),
    'available',
  );
  assert.equal(
    slotStatus(1, appointment.date, appointment.time, [appointment], {
      [key]: true,
    }),
    'booked',
  );
  const past = addDays(dateKey(), -1);
  assert.equal(
    slotStatus(1, past, '09:00', [], { [slotKey(1, past, '09:00')]: true }),
    'past',
  );
});

test('sample appointments have unique occupied slots and schedules differ by doctor', () => {
  const fixtures = sampleAppointments();
  assert.equal(
    new Set(
      fixtures.map((item) => slotKey(item.doctorId, item.date, item.time)),
    ).size,
    fixtures.length,
  );
  const day = addDays(dateKey(), 2);
  assert.ok(
    TIMES.some(
      (time) => slotStatus(1, day, time, []) !== slotStatus(2, day, time, []),
    ) || new Date(`${day}T12:00:00+07:00`).getUTCDay() === 0,
  );
  assert.equal(slotStatus(1, addDays(dateKey(), 31), '09:00', []), 'blocked');
});
