package com.example.healthcare.backend.common;

import java.util.Locale;

public final class Emails {

	private Emails() {
	}

	/** " John@Example.com " and "john@example.com" must be treated as the same account. */
	public static String normalize(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}
}
