package com.nib.backend.repository;

import com.nib.backend.model.ProcessedStripeEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedStripeEventRepository extends JpaRepository<ProcessedStripeEvent, String> {
}
