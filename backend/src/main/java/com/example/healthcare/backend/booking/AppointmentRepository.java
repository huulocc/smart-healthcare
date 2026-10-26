package com.example.healthcare.backend.booking;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface AppointmentRepository extends JpaRepository<Appointment, Long>, JpaSpecificationExecutor<Appointment> {
    @Override
    @EntityGraph(attributePaths = {"patient.user", "doctor.user", "doctor.department"})
    Page<Appointment> findAll(Specification<Appointment> specification, Pageable pageable);
    List<Appointment> findByDoctorIdAndAppointmentDateBetween(Long doctorId, LocalDate from, LocalDate to);
    List<Appointment> findByPatientIdAndAppointmentDate(Long patientId, LocalDate date);
    List<Appointment> findByDoctorIdAndAppointmentDateGreaterThanEqual(Long doctorId, LocalDate from);
    @Query("select a.status, count(a) from Appointment a group by a.status")
    List<Object[]> statusCounts();
    @Query("select a.status, count(a) from Appointment a where a.doctor.id = :doctorId group by a.status")
    List<Object[]> statusCountsByDoctorId(@Param("doctorId") Long doctorId);
}
