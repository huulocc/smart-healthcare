package com.example.healthcare.backend.doctor;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.doctor.dto.DoctorWeekResponse;
import com.example.healthcare.backend.doctor.dto.ScheduleSlotRequest;
import com.example.healthcare.backend.doctor.dto.ScheduleSlotResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminScheduleController {

	private final AdminScheduleService adminScheduleService;

	/** The schedule board: a page of active doctors, each with their whole week. */
	@GetMapping("/schedules")
	public PageResponse<DoctorWeekResponse> board(
			@RequestParam(required = false) String search,
			@RequestParam(required = false) Long departmentId,
			@RequestParam(required = false) Availability availability,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return adminScheduleService.board(search, departmentId, availability, page, size);
	}

	@GetMapping("/doctors/{doctorId}/schedules")
	public List<ScheduleSlotResponse> forDoctor(@PathVariable Long doctorId) {
		return adminScheduleService.forDoctor(doctorId);
	}

	@PostMapping("/doctors/{doctorId}/schedules")
	@ResponseStatus(HttpStatus.CREATED)
	public ScheduleSlotResponse add(@PathVariable Long doctorId, @Valid @RequestBody ScheduleSlotRequest request) {
		return adminScheduleService.add(doctorId, request);
	}

	@PutMapping("/schedules/{slotId}")
	public ScheduleSlotResponse update(@PathVariable Long slotId, @Valid @RequestBody ScheduleSlotRequest request) {
		return adminScheduleService.update(slotId, request);
	}

	/** A real delete: slots are configuration, not history. */
	@DeleteMapping("/schedules/{slotId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long slotId) {
		adminScheduleService.delete(slotId);
	}
}
