package com.example.healthcare.backend.doctor.dto;

import com.example.healthcare.backend.doctor.Availability;

import jakarta.validation.constraints.NotNull;

public record UpdateAvailabilityRequest(
		@NotNull(message = "Please select an availability")
		Availability availability) {
}
