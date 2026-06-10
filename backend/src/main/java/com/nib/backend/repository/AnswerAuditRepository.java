package com.nib.backend.repository;

import com.nib.backend.model.AnswerAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AnswerAuditRepository extends JpaRepository<AnswerAudit, UUID> {
}
