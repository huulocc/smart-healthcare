package com.example.healthcare.backend.doctor;

import java.util.List;
import java.util.Objects;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.common.Strings;
import com.example.healthcare.backend.department.Department;
import com.example.healthcare.backend.department.DepartmentRepository;
import com.example.healthcare.backend.department.DepartmentStatus;
import com.example.healthcare.backend.doctor.dto.DoctorResponse;
import com.example.healthcare.backend.doctor.dto.DoctorStatsResponse;
import com.example.healthcare.backend.doctor.dto.UpdateDoctorRequest;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * The admin's view of doctor profiles. Every method maps to DTOs inside its transaction:
 * open-in-view is off, so a lazy user or department read after it would fail.
 */
@Service
@RequiredArgsConstructor
public class AdminDoctorService {

	// id breaks ties between doctors with the same name, so pages never overlap or skip.
	static final Sort BY_NAME = Sort.by("user.fullName").and(Sort.by("id"));

	private final DoctorRepository doctorRepository;
	private final DepartmentRepository departmentRepository;
	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public PageResponse<DoctorResponse> search(String search, Long departmentId, String specialty,
			Availability availability, DoctorStatus status, int page, int size) {
		return PageResponse.from(
				doctorRepository.search(departmentId, Strings.trimToNull(specialty), availability, status,
						Strings.trimToNull(search), PageResponse.request(page, size, BY_NAME)),
				DoctorResponse::from);
	}

	@Transactional(readOnly = true)
	public DoctorStatsResponse stats() {
		return new DoctorStatsResponse(
				doctorRepository.count(),
				doctorRepository.countByStatus(DoctorStatus.ACTIVE),
				doctorRepository.countByAvailability(Availability.AVAILABLE),
				doctorRepository.countByAvailability(Availability.ON_LEAVE),
				userRepository.countByRoleAndRequestedRole(Role.PATIENT, Role.DOCTOR));
	}

	@Transactional(readOnly = true)
	public List<String> specialties() {
		return doctorRepository.findDistinctSpecialties();
	}

	@Transactional(readOnly = true)
	public DoctorResponse get(Long id) {
		return DoctorResponse.from(findDoctor(id));
	}

	@Transactional
	public DoctorResponse update(Long id, UpdateDoctorRequest request) {
		Doctor doctor = findDoctor(id);

		Long currentDepartmentId = doctor.getDepartment() == null ? null : doctor.getDepartment().getId();
		// Only a move is checked: editing someone's specialty must still work after their
		// department has been deactivated.
		if (!Objects.equals(currentDepartmentId, request.departmentId())) {
			Department department = request.departmentId() == null ? null : requireActiveDepartment(request.departmentId());
			// Heading a department requires belonging to it.
			clearHeadPositions(doctor);
			doctor.setDepartment(department);
		}

		doctor.setSpecialty(Strings.trimToNull(request.specialty()));
		doctor.setExperienceYears(request.experienceYears());
		doctor.setAvatarUrl(Strings.trimToNull(request.avatarUrl()));
		return DoctorResponse.from(doctor);
	}

	@Transactional
	public DoctorResponse updateAvailability(Long id, Availability availability) {
		Doctor doctor = findDoctor(id);
		// Otherwise a deactivated doctor could show up as "Available" in the stat tiles.
		if (doctor.getStatus() == DoctorStatus.INACTIVE && availability != Availability.OFF_DUTY) {
			throw new ApiException(HttpStatus.CONFLICT,
					"Activate this doctor before changing their availability", "availability");
		}
		doctor.setAvailability(availability);
		return DoctorResponse.from(doctor);
	}

	/** INACTIVE is how a doctor is removed: the row stays, because appointments and payments
	 *  will point at it. Reactivating leaves availability for the admin to set. */
	@Transactional
	public DoctorResponse updateStatus(Long id, DoctorStatus status) {
		Doctor doctor = findDoctor(id);
		doctor.setStatus(status);
		// The role travels in the JWT, so a deactivated doctor would keep ROLE_DOCTOR until their
		// token expired. Moving the account back to PATIENT closes that from the next login on.
		doctor.getUser().setRole(status == DoctorStatus.INACTIVE ? Role.PATIENT : Role.DOCTOR);
		if (status == DoctorStatus.INACTIVE) {
			doctor.setAvailability(Availability.OFF_DUTY);
			clearHeadPositions(doctor);
		}
		return DoctorResponse.from(doctor);
	}

	Doctor findDoctor(Long id) {
		return doctorRepository.findWithDetailsById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Doctor not found"));
	}

	/** For a department id sent in a request body: a bad id there is a form error, not a missing page. */
	Department requireActiveDepartment(Long departmentId) {
		Department department = departmentRepository.findById(departmentId)
				.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Department not found", "departmentId"));
		if (department.getStatus() != DepartmentStatus.ACTIVE) {
			throw new ApiException(HttpStatus.CONFLICT, "This department is inactive", "departmentId");
		}
		return department;
	}

	// Entity by entity rather than a bulk @Modifying update, which would leave departments
	// already loaded in this transaction still showing the old head.
	private void clearHeadPositions(Doctor doctor) {
		departmentRepository.findByHeadDoctorId(doctor.getId()).forEach(department -> department.setHeadDoctor(null));
	}
}
