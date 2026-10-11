package com.example.healthcare.backend.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Turns errors into one JSON shape the frontend can rely on:
 * { "status": 400, "detail": "Validation failed", "errors": { "email": "Invalid email address" } }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
		Map<String, String> errors = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors()
				.forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));

		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
		problem.setProperty("errors", errors);
		return problem;
	}

	/** A query parameter or path id of the wrong type, e.g. ?status=foo or /doctors/abc. */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		String message = "Invalid value for " + ex.getName();
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, message);
		problem.setProperty("errors", Map.of(ex.getName(), message));
		return problem;
	}

	/** Broken JSON, or a value Jackson cannot convert, such as an unknown enum name. */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ProblemDetail handleUnreadable(HttpMessageNotReadableException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "The request body is malformed");
	}

	/**
	 * The services check every unique rule before writing, so this only fires on a race, e.g.
	 * two admins approving the same person at once. Without it that race would be a 500.
	 */
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ProblemDetail handleConflict(DataIntegrityViolationException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "This change conflicts with existing data");
	}

	@ExceptionHandler(ApiException.class)
	public ProblemDetail handleApiException(ApiException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
		if (ex.getField() != null) {
			problem.setProperty("errors", Map.of(ex.getField(), ex.getMessage()));
		}
		return problem;
	}
}
