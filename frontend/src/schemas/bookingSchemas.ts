import { z } from 'zod';
import { dateKey } from '../data/appointmentDemo';

export function getDobLimits() {
  const max = dateKey();
  const [year, month, day] = max.split('-');
  const min = `${Number(year) - 130}-${month}-${day}`;
  return { min, max };
}

export const patientSchema = z.object({
  bookingFor: z.enum(['myself', 'someone']),
  patientName: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .max(100, 'Use 100 characters or fewer.'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .max(254, 'Use 254 characters or fewer.'),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => /^(0|\+84)[0-9]{9,10}$/.test(value.replace(/\s+/g, '')),
      'Enter a valid Vietnamese phone number (e.g. 0901234567 or +84901234567).',
    ),
  dob: z
    .string()
    .min(1, 'Date of birth is required.')
    .refine((value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const d = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return false;
      if (d.toISOString().slice(0, 10) !== value) return false;
      const { min, max } = getDobLimits();
      return value >= min && value <= max;
    }, 'Date of birth must be a valid date between 130 years ago and today.'),
  reason: z
    .string()
    .trim()
    .min(1, 'Please enter a reason for your visit.')
    .max(500, 'Use 500 characters or fewer.'),
  consent: z
    .boolean()
    .refine((value) => value === true, 'Please agree to the booking terms.'),
});
