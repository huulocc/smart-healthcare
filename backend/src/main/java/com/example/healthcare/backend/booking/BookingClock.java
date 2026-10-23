package com.example.healthcare.backend.booking;
import java.time.Clock;
import org.springframework.context.annotation.*;
@Configuration("bookingClockConfiguration")
public class BookingClock {
    @Bean public Clock bookingClock() { return Clock.system(AvailabilityEngine.ZONE); }
}
