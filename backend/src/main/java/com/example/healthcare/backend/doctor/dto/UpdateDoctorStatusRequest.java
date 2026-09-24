package com.example.healthcare.backend.doctor.dto;

import com.example.healthcare.backend.doctor.DoctorStatus;

import jakarta.validation.constraints.NotNull;

public record UpdateDoctorStatusRequest(
		@NotNull(message = "Please select a status")
		DoctorStatus status) {
}
