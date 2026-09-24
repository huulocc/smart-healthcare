package com.example.healthcare.backend.doctor;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, Long> {

	// Monday first, then by start time. Only correct because dayOfWeek is stored as its
	// ordinal -- see DoctorSchedule.
	List<DoctorSchedule> findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(Long doctorId);

	/** The week grid loads every visible doctor's shifts in one query. */
	@EntityGraph(attributePaths = { "doctor" })
	List<DoctorSchedule> findByDoctorIdInOrderByDayOfWeekAscStartTimeAsc(Collection<Long> doctorIds);

	/** One day of one doctor's week: what AdminScheduleService checks a change against. */
	List<DoctorSchedule> findByDoctorIdAndDayOfWeek(Long doctorId, DayOfWeek dayOfWeek);

	boolean existsByDoctorIdAndDayOfWeekAndStartTime(Long doctorId, DayOfWeek dayOfWeek, LocalTime startTime);
}
