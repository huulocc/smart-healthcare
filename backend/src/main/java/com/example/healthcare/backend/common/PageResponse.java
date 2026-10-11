package com.example.healthcare.backend.common;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/**
 * One page of a list, in a JSON shape the frontend can rely on.
 * Spring Data warns that serialising its own Page directly gives no stable JSON contract.
 */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

	public static final int MAX_SIZE = 100;

	public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
		return new PageResponse<>(page.getContent().stream().map(mapper).toList(),
				page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
	}

	/** Query parameters come straight from the URL, so keep them in range: PageRequest throws
	 *  on a negative page (a 500), and an unbounded size would let one request load everything. */
	public static PageRequest request(int page, int size, Sort sort) {
		return PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_SIZE), sort);
	}
}
