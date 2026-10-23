package com.example.healthcare.backend.booking;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface BookingRequestKeyRepository extends JpaRepository<BookingRequestKey, Long> {
    Optional<BookingRequestKey> findByUserIdAndRequestKey(Long userId, String requestKey);
}
