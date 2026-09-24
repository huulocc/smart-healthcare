package com.example.healthcare.backend.doctor.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

import com.example.healthcare.backend.doctor.DoctorSchedule;
import com.example.healthcare.backend.doctor.ShiftType;

public record ScheduleSlotResponse(Long id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime,
		ShiftType shiftType) {

	public static ScheduleSlotResponse from(DoctorSchedule slot) {
		return new ScheduleSlotResponse(slot.getId(), slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime(),
				slot.getShiftType());
	}
}
