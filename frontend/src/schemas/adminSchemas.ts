import { z } from 'zod';

/**
 * The same rules the backend enforces, in the same words, so a mistake is caught before the
 * round trip and reads identically when the server catches it first.
 *
 * Every field starts as a string, because that is what an input or a select hands over, and
 * each schema transforms it into what the API wants. An empty select means "none", which is
 * null to the server -- not 0.
 */

const optionalId = z
  .string()
  .transform((value) => (value.trim() === '' ? null : Number(value)));

const experienceYears = z
  .string()
  .trim()
  .refine(
    (value) => /^-?\d+$/.test(value),
    'Please enter the years of experience',
  )
  .transform(Number)
  .refine((years) => years >= 0, 'Experience cannot be negative')
  .refine((years) => years <= 70, 'Experience must be at most 70 years');

const specialty = z
  .string()
  .trim()
  .max(100, 'Specialty must be at most 100 characters');

const description = z
  .string()
  .trim()
  .max(255, 'Description must be at most 255 characters');

const departmentName = z
  .string()
  .trim()
  .min(1, 'Please enter a department name')
  .max(100, 'Department name must be at most 100 characters');

export const doctorSchema = z.object({
  departmentId: optionalId,
  specialty,
  experienceYears,
  avatarUrl: z
    .string()
    .trim()
    .max(255, 'Avatar URL must be at most 255 characters')
    // Rendered straight into an <img>, so nothing but a path in the app or a plain address.
    .refine(
      (value) => value === '' || /^(\/|https?:\/\/)/.test(value),
      'Avatar URL must start with / or http://',
    ),
});

export type DoctorFormValues = z.input<typeof doctorSchema>;
export type DoctorFormOutput = z.output<typeof doctorSchema>;

export const approveDoctorSchema = z.object({
  departmentId: z
    .string()
    .trim()
    .min(1, 'Please select a department')
    .transform(Number),
  specialty,
  experienceYears,
});

export type ApproveDoctorFormValues = z.input<typeof approveDoctorSchema>;
export type ApproveDoctorFormOutput = z.output<typeof approveDoctorSchema>;

export const createDepartmentSchema = z.object({
  name: departmentName,
  description,
});

export type CreateDepartmentFormValues = z.input<typeof createDepartmentSchema>;
export type CreateDepartmentFormOutput = z.output<
  typeof createDepartmentSchema
>;

export const updateDepartmentSchema = z.object({
  name: departmentName,
  description,
  headDoctorId: optionalId,
  status: z.enum(['ACTIVE', 'INACTIVE'], { message: 'Please select a status' }),
});

export type UpdateDepartmentFormValues = z.input<typeof updateDepartmentSchema>;
export type UpdateDepartmentFormOutput = z.output<
  typeof updateDepartmentSchema
>;

export const scheduleSlotSchema = z
  .object({
    dayOfWeek: z.enum(
      [
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY',
      ],
      { message: 'Please select a day' },
    ),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please enter a start time'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Please enter an end time'),
    shiftType: z.enum(['WORK', 'BREAK', 'LEAVE'], {
      message: 'Please select a shift type',
    }),
  })
  // Zero-padded HH:mm compares correctly as text. A shift crossing midnight is two slots.
  .refine((slot) => slot.endTime > slot.startTime, {
    path: ['endTime'],
    message: 'End time must be after start time',
  });

export type ScheduleSlotFormValues = z.input<typeof scheduleSlotSchema>;
export type ScheduleSlotFormOutput = z.output<typeof scheduleSlotSchema>;
