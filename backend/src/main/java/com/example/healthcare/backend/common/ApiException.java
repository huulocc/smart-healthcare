package com.example.healthcare.backend.common;

import org.springframework.http.HttpStatus;

import lombok.Getter;

/**
 * An expected business error, e.g. "email already registered".
 * {@code field} is the form field the error belongs to, or null for a form-level error.
 */
@Getter
public class ApiException extends RuntimeException {

	private final HttpStatus status;
	private final String field;

	public ApiException(HttpStatus status, String message) {
		this(status, message, null);
	}

	public ApiException(HttpStatus status, String message, String field) {
		super(message);
		this.status = status;
		this.field = field;
	}
}
