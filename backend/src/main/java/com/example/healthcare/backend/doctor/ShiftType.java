package com.example.healthcare.backend.doctor;

/**
 * What a slot in the weekly schedule is.
 *
 * There is no BOOKED: in the schedule board a booked shift is a visual overlay meaning
 * "this shift has appointments in it", derived from appointments rather than stored here.
 * LEAVE covers a recurring non-working day; a one-off absence needs real dates and
 * belongs in a future doctor_time_off table.
 */
public enum ShiftType {
	WORK,
	BREAK,
	LEAVE
}
