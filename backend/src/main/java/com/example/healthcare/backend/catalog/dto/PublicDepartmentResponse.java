package com.example.healthcare.backend.catalog.dto;

import com.example.healthcare.backend.department.Department;

/**
 * A department as an anonymous visitor sees it.
 *
 * Deliberately narrower than {@code DepartmentResponse}: no {@code deptCode}, no
 * {@code status} and no head doctor. The admin screens need those to manage the
 * record; a visitor browsing the directory does not, and every field left out is
 * one that cannot leak.
 */
public record PublicDepartmentResponse(
		Long id,
		String name,
		String description,
		long activeDoctors) {

	public static PublicDepartmentResponse from(Department department, long activeDoctors) {
		return new PublicDepartmentResponse(
				department.getId(),
				department.getName(),
				department.getDescription(),
				activeDoctors);
	}
}
