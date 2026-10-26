package com.example.healthcare.backend.catalog;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.healthcare.backend.booking.BookingDtos.DoctorInfo;
import com.example.healthcare.backend.catalog.dto.PublicDepartmentResponse;
import com.example.healthcare.backend.common.PageResponse;

import lombok.RequiredArgsConstructor;

/**
 * The only endpoints an anonymous visitor may call besides {@code /api/auth/**}.
 *
 * Read-only on purpose: GET and nothing else. {@code SecurityConfig} permits this
 * prefix for GET alone, so adding a write method here would not quietly become a
 * public write - it would 401 until someone changed the security chain too.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicCatalogController {

	private final PublicCatalogService service;

	@GetMapping("/departments")
	public List<PublicDepartmentResponse> departments() {
		return service.departments();
	}

	@GetMapping("/doctors")
	public PageResponse<DoctorInfo> doctors(
			@RequestParam(required = false) Long departmentId,
			@RequestParam(required = false) String search,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return service.doctors(departmentId, search, page, size);
	}

	@GetMapping("/doctors/{id}")
	public DoctorInfo doctor(@PathVariable Long id) {
		return service.doctor(id);
	}
}
