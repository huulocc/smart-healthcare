package com.example.healthcare.backend.booking;
import java.util.List;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AppointmentHistoryRepository extends JpaRepository<AppointmentHistory, Long> {
    Page<AppointmentHistory> findByAppointmentId(Long appointmentId, Pageable pageable);
}
