package com.example.healthcare.backend.department.dto;

import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentStatus;
import com.example.healthcare.backend.doctor.Doctor;

public record DepartmentResponse(
		Long id,
		String deptCode,
		String name,
		String description,
		DepartmentStatus status,
		HeadDoctor headDoctor,
		long activeDoctors) {

	public record HeadDoctor(Long id, String doctorCode, String fullName) {
	}

	/** Reads the lazy head doctor and their account, so call it inside a transaction. */
	public static DepartmentResponse from(Department department, long activeDoctors) {
		Doctor head = department.getHeadDoctor();
		return new DepartmentResponse(
				department.getId(),
				department.getDeptCode(),
				department.getName(),
				department.getDescription(),
				department.getStatus(),
				head == null ? null : new HeadDoctor(head.getId(), head.getDoctorCode(), head.getUser().getFullName()),
				activeDoctors);
	}
}
