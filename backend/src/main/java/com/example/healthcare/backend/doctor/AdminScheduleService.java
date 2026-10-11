package com.example.healthcare.backend.doctor;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.common.Strings;
import com.example.healthcare.backend.doctor.dto.DoctorResponse;
import com.example.healthcare.backend.doctor.dto.DoctorWeekResponse;
import com.example.healthcare.backend.doctor.dto.ScheduleSlotRequest;
import com.example.healthcare.backend.doctor.dto.ScheduleSlotResponse;

import lombok.RequiredArgsConstructor;

/**
 * The weekly shifts behind the schedule board.
 *
 * Every change -- add, edit or delete -- is checked against the whole day it leaves behind,
 * because deleting or shrinking a working shift can strand a break just as surely as adding
 * one can overlap. The rules, on half-open intervals [start, end):
 * <ol>
 * <li>No two slots on a day start at the same time (the database's unique key).</li>
 * <li>WORK and LEAVE slots do not overlap each other.</li>
 * <li>Breaks do not overlap each other, and each lies inside a WORK slot.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class AdminScheduleService {

	private final DoctorScheduleRepository scheduleRepository;
	private final DoctorRepository doctorRepository;

	/** Active doctors only: the board is about who is working. Anyone's week can still be
	 *  opened through the doctor's own schedule. */
	@Transactional(readOnly = true)
	public PageResponse<DoctorWeekResponse> board(String search, Long departmentId, Availability availability,
			int page, int size) {
		Page<Doctor> doctors = doctorRepository.search(departmentId, null, availability, DoctorStatus.ACTIVE,
				Strings.trimToNull(search), PageResponse.request(page, size, AdminDoctorService.BY_NAME));

		List<Long> ids = doctors.getContent().stream().map(Doctor::getId).toList();
		// One query for every shift on the page, already in Monday-first order.
		Map<Long, List<ScheduleSlotResponse>> slotsByDoctor = ids.isEmpty() ? Map.of()
				: scheduleRepository.findByDoctorIdInOrderByDayOfWeekAscStartTimeAsc(ids).stream()
						.collect(Collectors.groupingBy(slot -> slot.getDoctor().getId(),
								Collectors.mapping(ScheduleSlotResponse::from, Collectors.toList())));

		return PageResponse.from(doctors, doctor -> new DoctorWeekResponse(
				DoctorResponse.from(doctor), slotsByDoctor.getOrDefault(doctor.getId(), List.of())));
	}

	@Transactional(readOnly = true)
	public List<ScheduleSlotResponse> forDoctor(Long doctorId) {
		findDoctor(doctorId);
		return scheduleRepository.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctorId).stream()
				.map(ScheduleSlotResponse::from)
				.toList();
	}

	@Transactional
	public ScheduleSlotResponse add(Long doctorId, ScheduleSlotRequest request) {
		Doctor doctor = findDoctor(doctorId);
		requireEndAfterStart(request);

		List<Slot> day = otherSlots(doctorId, request.dayOfWeek(), null);
		day.add(new Slot(null, request.startTime(), request.endTime(), request.shiftType()));
		validateDay(day);

		DoctorSchedule slot = new DoctorSchedule();
		slot.setDoctor(doctor);
		apply(slot, request);
		return ScheduleSlotResponse.from(scheduleRepository.save(slot));
	}

	@Transactional
	public ScheduleSlotResponse update(Long slotId, ScheduleSlotRequest request) {
		DoctorSchedule slot = findSlot(slotId);
		requireEndAfterStart(request);
		Long doctorId = slot.getDoctor().getId();

		// Everything is checked before the managed entity changes: the queries below flush
		// pending changes first, and a half-applied edit could hit the database's own
		// constraints and come back as a vague error instead of the rule that was broken.
		List<Slot> newDay = otherSlots(doctorId, request.dayOfWeek(), slotId);
		newDay.add(new Slot(slotId, request.startTime(), request.endTime(), request.shiftType()));
		validateDay(newDay);
		if (slot.getDayOfWeek() != request.dayOfWeek()) {
			// Moving a working shift to another day must not strand a break on the old one.
			validateDay(otherSlots(doctorId, slot.getDayOfWeek(), slotId));
		}

		apply(slot, request);
		return ScheduleSlotResponse.from(slot);
	}

	@Transactional
	public void delete(Long slotId) {
		DoctorSchedule slot = findSlot(slotId);
		validateDay(otherSlots(slot.getDoctor().getId(), slot.getDayOfWeek(), slotId));
		scheduleRepository.delete(slot);
	}

	private void validateDay(List<Slot> day) {
		for (int i = 0; i < day.size(); i++) {
			for (int j = i + 1; j < day.size(); j++) {
				Slot a = day.get(i);
				Slot b = day.get(j);
				if (a.start().equals(b.start())) {
					throw conflict("Another shift on this day already starts at " + a.start());
				}
				if (a.isBreak() == b.isBreak() && a.overlaps(b)) {
					throw conflict(a.isBreak() ? "This break overlaps another break"
							: "This shift overlaps another shift on the same day");
				}
			}
		}
		for (Slot pause : day) {
			if (pause.isBreak() && day.stream().noneMatch(work -> work.type() == ShiftType.WORK && pause.within(work))) {
				throw conflict("Every break must fall inside a working shift on the same day");
			}
		}
	}

	/** The day as it would be without the slot being changed, as plain values. */
	private List<Slot> otherSlots(Long doctorId, DayOfWeek day, Long excludedSlotId) {
		List<Slot> slots = new ArrayList<>();
		for (DoctorSchedule existing : scheduleRepository.findByDoctorIdAndDayOfWeek(doctorId, day)) {
			if (!Objects.equals(existing.getId(), excludedSlotId)) {
				slots.add(new Slot(existing.getId(), existing.getStartTime(), existing.getEndTime(),
						existing.getShiftType()));
			}
		}
		return slots;
	}

	private static void requireEndAfterStart(ScheduleSlotRequest request) {
		if (!request.endTime().isAfter(request.startTime())) {
			// A shift crossing midnight is two slots, one per day.
			throw new ApiException(HttpStatus.BAD_REQUEST, "End time must be after start time", "endTime");
		}
	}

	private static void apply(DoctorSchedule slot, ScheduleSlotRequest request) {
		slot.setDayOfWeek(request.dayOfWeek());
		slot.setStartTime(request.startTime());
		slot.setEndTime(request.endTime());
		slot.setShiftType(request.shiftType());
	}

	private static ApiException conflict(String message) {
		return new ApiException(HttpStatus.CONFLICT, message, "startTime");
	}

	private Doctor findDoctor(Long doctorId) {
		return doctorRepository.findById(doctorId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Doctor not found"));
	}

	private DoctorSchedule findSlot(Long slotId) {
		return scheduleRepository.findById(slotId)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Schedule slot not found"));
	}

	private record Slot(Long id, LocalTime start, LocalTime end, ShiftType type) {

		boolean isBreak() {
			return type == ShiftType.BREAK;
		}

		boolean overlaps(Slot other) {
			return start.isBefore(other.end) && other.start.isBefore(end);
		}

		boolean within(Slot other) {
			return !start.isBefore(other.start) && !end.isAfter(other.end);
		}
	}
}
