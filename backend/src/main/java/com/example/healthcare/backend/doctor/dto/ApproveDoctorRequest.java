package com.example.healthcare.backend.doctor.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** What the admin fills in to turn a request into a doctor profile. */
public record ApproveDoctorRequest(
		@NotNull(message = "Please select a department")
		Long departmentId,

		@Size(max = 100, message = "Specialty must be at most 100 characters")
		String specialty,

		@NotNull(message = "Please enter the years of experience")
		@Min(value = 0, message = "Experience cannot be negative")
		@Max(value = 70, message = "Experience must be at most 70 years")
		Integer experienceYears) {
}
