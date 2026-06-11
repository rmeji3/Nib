package com.nib.backend.repository;

import com.nib.backend.model.AnswerAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnswerAuditRepository extends JpaRepository<AnswerAudit, UUID> {
    List<AnswerAudit> findByAssistantMessageIdIn(List<UUID> assistantMessageIds);

    void deleteByAssistantMessageId(UUID assistantMessageId);
}
