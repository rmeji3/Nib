package com.nib.backend.repository;

import com.nib.backend.model.Collection;
import com.nib.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CollectionRepository extends JpaRepository<Collection, UUID> {

    List<Collection> findByUserOrderByCreatedAtDesc(User user);

    Optional<Collection> findByIdAndUser(UUID id, User user);
}
