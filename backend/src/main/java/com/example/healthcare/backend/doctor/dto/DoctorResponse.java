package com.example.healthcare.backend.doctor.dto;

import java.time.Instant;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.doctor.Availability;
import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorStatus;
import com.example.healthcare.backend.user.User;

/** One row of the admin doctors table. Name, email and phone come from the doctor's account. */
public record DoctorResponse(
		Long id,
		String doctorCode,
		Long userId,
		String fullName,
		String email,
		String phone,
		String avatarUrl,
		DepartmentSummary department,
		String specialty,
		Integer experienceYears,
		Availability availability,
		DoctorStatus status,
		Instant createdAt) {

	public record DepartmentSummary(Long id, String deptCode, String name) {
	}

	/** Reads the lazy user and department, so call it inside a transaction. */
	public static DoctorResponse from(Doctor doctor) {
		User user = doctor.getUser();
		Department department = doctor.getDepartment();
		return new DoctorResponse(
				doctor.getId(),
				doctor.getDoctorCode(),
				user.getId(),
				user.getFullName(),
				user.getEmail(),
				user.getPhone(),
				doctor.getAvatarUrl(),
				department == null ? null
						: new DepartmentSummary(department.getId(), department.getDeptCode(), department.getName()),
				doctor.getSpecialty(),
				doctor.getExperienceYears(),
				doctor.getAvailability(),
				doctor.getStatus(),
				doctor.getCreatedAt());
	}
}
