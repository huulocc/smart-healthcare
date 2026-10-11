package com.example.healthcare.backend.department.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDepartmentRequest(
		@NotBlank(message = "Please enter a department name")
		@Size(max = 100, message = "Department name must be at most 100 characters")
		String name,

		@Size(max = 255, message = "Description must be at most 255 characters")
		String description) {
}
