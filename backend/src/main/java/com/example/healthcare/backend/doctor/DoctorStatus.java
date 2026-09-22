package com.example.healthcare.backend.doctor;

/** Whether the doctor profile is in use. Separate from DepartmentStatus on purpose:
 *  a doctor plausibly gains SUSPENDED one day, a department does not. */
public enum DoctorStatus {
	ACTIVE,
	INACTIVE
}
