package com.nib.backend.repository;

import com.nib.backend.model.ChatMessageFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ChatMessageFeedbackRepository extends JpaRepository<ChatMessageFeedback, UUID> {
    boolean existsByMessageIdAndUserIdAndFeedbackType(UUID messageId, UUID userId, String feedbackType);

    List<ChatMessageFeedback> findByMessageIdInAndUserIdAndFeedbackType(
            Collection<UUID> messageIds,
            UUID userId,
            String feedbackType
    );

    void deleteByMessageId(UUID messageId);
}
