package com.example.healthcare.backend.doctor;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.doctor.dto.ApproveDoctorRequest;
import com.example.healthcare.backend.doctor.dto.DoctorRequestResponse;
import com.example.healthcare.backend.doctor.dto.DoctorResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/doctor-requests")
@RequiredArgsConstructor
public class DoctorRequestController {

	private final DoctorRequestService doctorRequestService;

	@GetMapping
	public PageResponse<DoctorRequestResponse> pending(
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return doctorRequestService.pending(page, size);
	}

	@PostMapping("/{userId}/approve")
	@ResponseStatus(HttpStatus.CREATED)
	public DoctorResponse approve(@PathVariable Long userId, @Valid @RequestBody ApproveDoctorRequest request) {
		return doctorRequestService.approve(userId, request);
	}

	@PostMapping("/{userId}/reject")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void reject(@PathVariable Long userId) {
		doctorRequestService.reject(userId);
	}
}
