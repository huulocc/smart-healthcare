package com.example.healthcare.backend.department;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.Strings;
import com.example.healthcare.backend.department.dto.CreateDepartmentRequest;
import com.example.healthcare.backend.department.dto.DepartmentResponse;
import com.example.healthcare.backend.department.dto.UpdateDepartmentRequest;
import com.example.healthcare.backend.doctor.Doctor;
import com.example.healthcare.backend.doctor.DoctorRepository;
import com.example.healthcare.backend.doctor.DoctorStatus;

import lombok.RequiredArgsConstructor;

/** Departments are never deleted: doctors point at them. An INACTIVE one takes no new doctors. */
@Service
@RequiredArgsConstructor
public class AdminDepartmentService {

	private final DepartmentRepository departmentRepository;
	private final DoctorRepository doctorRepository;

	/** Two queries for the whole table, however many departments there are. */
	@Transactional(readOnly = true)
	public List<DepartmentResponse> list() {
		Map<Long, Long> activeDoctors = activeDoctorCounts();
		return departmentRepository.findAllWithHead().stream()
				.map(department -> DepartmentResponse.from(department, activeDoctors.getOrDefault(department.getId(), 0L)))
				.toList();
	}

	@Transactional(readOnly = true)
	public DepartmentResponse get(Long id) {
		return toResponse(findDepartment(id));
	}

	@Transactional
	public DepartmentResponse create(CreateDepartmentRequest request) {
		String name = request.name().trim();
		// The MySQL collation already ignores case here; this check is what makes that an
		// answer the form can show instead of a database error.
		if (departmentRepository.existsByNameIgnoreCase(name)) {
			throw new ApiException(HttpStatus.CONFLICT, "A department with this name already exists", "name");
		}

		Department department = new Department();
		department.setName(name);
		department.setDescription(Strings.trimToNull(request.description()));
		// dept_code is NOT NULL but the real code needs the id, which only exists after the
		// INSERT. A random placeholder keeps it unique until it is replaced before commit.
		department.setDeptCode("TMP-" + UUID.randomUUID().toString().substring(0, 12));
		department = departmentRepository.save(department);
		department.setDeptCode(Department.codeFor(department.getId()));

		return DepartmentResponse.from(department, 0);
	}

	@Transactional
	public DepartmentResponse update(Long id, UpdateDepartmentRequest request) {
		Department department = findDepartment(id);

		String name = request.name().trim();
		if (departmentRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
			throw new ApiException(HttpStatus.CONFLICT, "A department with this name already exists", "name");
		}

		department.setHeadDoctor(request.headDoctorId() == null ? null : requireHead(request.headDoctorId(), id));
		department.setName(name);
		department.setDescription(Strings.trimToNull(request.description()));
		department.setStatus(request.status());
		return toResponse(department);
	}

	private Doctor requireHead(Long doctorId, Long departmentId) {
		Doctor doctor = doctorRepository.findWithDetailsById(doctorId)
				.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Doctor not found", "headDoctorId"));
		if (doctor.getStatus() != DoctorStatus.ACTIVE) {
			throw new ApiException(HttpStatus.CONFLICT, "The head of a department must be an active doctor",
					"headDoctorId");
		}
		if (doctor.getDepartment() == null || !doctor.getDepartment().getId().equals(departmentId)) {
			throw new ApiException(HttpStatus.CONFLICT, "The head of a department must be one of its doctors",
					"headDoctorId");
		}
		return doctor;
	}

	private DepartmentResponse toResponse(Department department) {
		return DepartmentResponse.from(department, activeDoctorCounts().getOrDefault(department.getId(), 0L));
	}

	private Map<Long, Long> activeDoctorCounts() {
		return doctorRepository.countByDepartment(DoctorStatus.ACTIVE).stream()
				.collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
	}

	private Department findDepartment(Long id) {
		return departmentRepository.findWithHeadById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Department not found"));
	}
}
