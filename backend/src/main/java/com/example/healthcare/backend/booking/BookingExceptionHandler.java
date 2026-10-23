package com.example.healthcare.backend.booking;

import org.springframework.core.annotation.Order;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.example.healthcare.backend.common.GlobalExceptionHandler;
import jakarta.persistence.*;

/** Reuses the existing problem-details contract without exposing JDBC exception text. */
@Order(-10) @RestControllerAdvice(basePackageClasses = BookingController.class)
public class BookingExceptionHandler extends GlobalExceptionHandler {
    @ExceptionHandler({PessimisticLockingFailureException.class, org.springframework.dao.QueryTimeoutException.class,
        jakarta.persistence.QueryTimeoutException.class,
        LockTimeoutException.class, PessimisticLockException.class})
    public ProblemDetail busy(Exception ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Booking changed concurrently. Retry the request with the same Idempotency-Key");
    }
    @ExceptionHandler(Exception.class)
    public ProblemDetail unexpected(Exception ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to process the appointment request");
    }
}
