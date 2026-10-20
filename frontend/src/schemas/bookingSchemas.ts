import { z } from 'zod';
import { dateKey } from '../data/appointmentDemo';

export const patientSchema = z.object({
  bookingFor: z.enum(['myself', 'someone']),
  patientName: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .max(100, 'Use 100 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .refine(
      (value) =>
        /^\+?[\d\s()-]+$/.test(value) &&
        value.replace(/\D/g, '').length >= 9 &&
        value.replace(/\D/g, '').length <= 15,
      'Enter a phone number with 9–15 digits.',
    ),
  dob: z
    .string()
    .refine(
      (value) =>
        !value ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value &&
          value <= dateKey()),
      'Use a valid date of birth that is not in the future.',
    ),
  reason: z.string().max(500, 'Use 500 characters or fewer.'),
  consent: z
    .boolean()
    .refine((value) => value, 'Please acknowledge the demo booking terms.'),
});
