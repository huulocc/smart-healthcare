package com.example.healthcare.backend.doctor;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.doctor.dto.DoctorResponse;
import com.example.healthcare.backend.doctor.dto.DoctorStatsResponse;
import com.example.healthcare.backend.doctor.dto.UpdateAvailabilityRequest;
import com.example.healthcare.backend.doctor.dto.UpdateDoctorRequest;
import com.example.healthcare.backend.doctor.dto.UpdateDoctorStatusRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/doctors")
@RequiredArgsConstructor
public class AdminDoctorController {

	private final AdminDoctorService adminDoctorService;

	@GetMapping
	public PageResponse<DoctorResponse> search(
			@RequestParam(required = false) String search,
			@RequestParam(required = false) Long departmentId,
			@RequestParam(required = false) String specialty,
			@RequestParam(required = false) Availability availability,
			@RequestParam(required = false) DoctorStatus status,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return adminDoctorService.search(search, departmentId, specialty, availability, status, page, size);
	}

	@GetMapping("/stats")
	public DoctorStatsResponse stats() {
		return adminDoctorService.stats();
	}

	@GetMapping("/specialties")
	public List<String> specialties() {
		return adminDoctorService.specialties();
	}

	@GetMapping("/{id}")
	public DoctorResponse get(@PathVariable Long id) {
		return adminDoctorService.get(id);
	}

	@PutMapping("/{id}")
	public DoctorResponse update(@PathVariable Long id, @Valid @RequestBody UpdateDoctorRequest request) {
		return adminDoctorService.update(id, request);
	}

	@PatchMapping("/{id}/availability")
	public DoctorResponse updateAvailability(@PathVariable Long id, @Valid @RequestBody UpdateAvailabilityRequest request) {
		return adminDoctorService.updateAvailability(id, request.availability());
	}

	/** There is no DELETE: setting INACTIVE is how a doctor is removed. */
	@PatchMapping("/{id}/status")
	public DoctorResponse updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateDoctorStatusRequest request) {
		return adminDoctorService.updateStatus(id, request.status());
	}
}
