package com.example.healthcare.backend.common;

public final class Strings {

	private Strings() {
	}

	/**
	 * Trims, and turns "" into null. Filters and optional fields arrive from forms and query
	 * strings as empty strings; stored or compared as-is, specialty = '' would match nothing.
	 */
	public static String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}
}
