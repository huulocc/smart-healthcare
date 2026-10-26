package com.example.healthcare.backend.admin.ai;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AiUsageEventRepository extends JpaRepository<AiUsageEvent, Long> {

    Optional<AiUsageEvent> findByRequestId(String requestId);

    Page<AiUsageEvent> findAllByOrderByTimestampDesc(Pageable pageable);

    Page<AiUsageEvent> findByTimestampBetweenOrderByTimestampDesc(Instant from, Instant to, Pageable pageable);

    Page<AiUsageEvent> findByStatusOrderByTimestampDesc(String status, Pageable pageable);

    @Query("SELECT e.status, COUNT(e) FROM AiUsageEvent e WHERE e.timestamp >= :from AND e.timestamp <= :to GROUP BY e.status")
    List<Object[]> countByStatusBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT e.model, COUNT(e), SUM(e.estimatedCost), AVG(e.latencyMs), SUM(e.totalTokens) FROM AiUsageEvent e WHERE e.timestamp >= :from AND e.timestamp <= :to GROUP BY e.model")
    List<Object[]> statsByModelBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT e.provider, COUNT(e), SUM(e.estimatedCost) FROM AiUsageEvent e WHERE e.timestamp >= :from AND e.timestamp <= :to GROUP BY e.provider")
    List<Object[]> statsByProviderBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT e.errorCode, COUNT(e) FROM AiUsageEvent e WHERE e.errorCode IS NOT NULL AND e.timestamp >= :from AND e.timestamp <= :to GROUP BY e.errorCode")
    List<Object[]> errorBreakdownBetween(@Param("from") Instant from, @Param("to") Instant to);

    List<AiUsageEvent> findByTimestampBetweenOrderByTimestampAsc(Instant from, Instant to);
}
