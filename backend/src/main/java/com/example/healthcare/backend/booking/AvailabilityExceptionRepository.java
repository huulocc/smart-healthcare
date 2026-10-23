package com.example.healthcare.backend.booking;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AvailabilityExceptionRepository extends JpaRepository<AvailabilityException, Long> {
    List<AvailabilityException> findByDoctorIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(
        Long doctorId, LocalDate from, LocalDate to);
}
