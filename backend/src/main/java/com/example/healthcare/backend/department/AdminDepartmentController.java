package com.example.healthcare.backend.department;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.healthcare.backend.department.dto.CreateDepartmentRequest;
import com.example.healthcare.backend.department.dto.DepartmentResponse;
import com.example.healthcare.backend.department.dto.UpdateDepartmentRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/departments")
@RequiredArgsConstructor
public class AdminDepartmentController {

	private final AdminDepartmentService adminDepartmentService;

	/** Not paged: there are a handful of departments, and the same list fills every department dropdown. */
	@GetMapping
	public List<DepartmentResponse> list() {
		return adminDepartmentService.list();
	}

	@GetMapping("/{id}")
	public DepartmentResponse get(@PathVariable Long id) {
		return adminDepartmentService.get(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public DepartmentResponse create(@Valid @RequestBody CreateDepartmentRequest request) {
		return adminDepartmentService.create(request);
	}

	/** There is no DELETE: setting the status to INACTIVE is how a department is retired. */
	@PutMapping("/{id}")
	public DepartmentResponse update(@PathVariable Long id, @Valid @RequestBody UpdateDepartmentRequest request) {
		return adminDepartmentService.update(id, request);
	}
}
