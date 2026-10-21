package com.example.healthcare.backend.doctor.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateDoctorRequest(
		// Null leaves the doctor without a department.
		Long departmentId,

		@Size(max = 100, message = "Specialty must be at most 100 characters")
		String specialty,

		// Integer rather than int: Jackson 3 rejects an explicit null for a primitive before
		// validation runs, which would give a vague "malformed body" instead of this message.
		@NotNull(message = "Please enter the years of experience")
		@Min(value = 0, message = "Experience cannot be negative")
		@Max(value = 70, message = "Experience must be at most 70 years")
		Integer experienceYears,

		// The admin page renders this straight into an <img>, so only a path inside the app or a
		// plain http(s) address is accepted -- "javascript:..." never reaches the browser.
		@Size(max = 255, message = "Avatar URL must be at most 255 characters")
		@Pattern(regexp = "^$|^/.*$|^https?://.+$",
				message = "Avatar URL must start with / or http://")
		String avatarUrl) {
}
