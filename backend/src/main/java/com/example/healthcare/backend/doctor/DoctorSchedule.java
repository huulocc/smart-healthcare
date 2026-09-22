package com.example.healthcare.backend.doctor;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One recurring shift in a doctor's week.
 *
 * The schedule board manages working hours, not a diary: an admin sets "Dr. Chen works
 * 09:00-17:00 on Mondays" once, not fifty-two times. A month view renders by spreading
 * this template over the month, which needs no extra rows.
 */
@Entity
@Table(name = "doctor_schedules")
@Getter
@Setter
@NoArgsConstructor
public class DoctorSchedule {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "doctor_id", nullable = false)
	private Doctor doctor;

	// ORDINAL, unlike every other enum here, and deliberately so: stored as a string,
	// "order by dayOfWeek" would sort FRIDAY, MONDAY, SATURDAY... which is wrong for a
	// Mon..Sun grid and would force ORDER BY FIELD(...) into every query. The usual
	// objection to ORDINAL -- someone reorders the constants and the data silently
	// shifts -- cannot happen: java.time.DayOfWeek's order is frozen by the JDK.
	@Enumerated(EnumType.ORDINAL)
	@Column(nullable = false)
	private DayOfWeek dayOfWeek;

	@Column(nullable = false)
	private LocalTime startTime;

	// A shift crossing midnight has to be split into two rows, one per day; the database
	// rejects end_time <= start_time.
	@Column(nullable = false)
	private LocalTime endTime;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ShiftType shiftType = ShiftType.WORK;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;
}
