package com.example.healthcare.backend.doctor.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

import com.example.healthcare.backend.doctor.ShiftType;

import jakarta.validation.constraints.NotNull;

/** Times are accepted as "09:00" or "09:00:00". */
public record ScheduleSlotRequest(
		@NotNull(message = "Please select a day")
		DayOfWeek dayOfWeek,

		@NotNull(message = "Please enter a start time")
		LocalTime startTime,

		@NotNull(message = "Please enter an end time")
		LocalTime endTime,

		@NotNull(message = "Please select a shift type")
		ShiftType shiftType) {
}
