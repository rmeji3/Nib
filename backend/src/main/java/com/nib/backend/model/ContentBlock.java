package com.nib.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "content_blocks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    @Column(name = "block_type", nullable = false)
    private String blockType;

    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    @Column(name = "extracted_text", nullable = false, columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "token_count")
    private Integer tokenCount;

    // Block-level provenance: bounding box of this chunk in PDF user units,
    // top-left origin (Y axis pointing down). Nullable — older rows ingested
    // before the bbox pipeline have these as null and fall back to text-layer
    // search highlighting in the viewer. For visual_summary blocks the bbox
    // covers the entire page.
    @Column(name = "bbox_x")
    private Double bboxX;

    @Column(name = "bbox_y")
    private Double bboxY;

    @Column(name = "bbox_width")
    private Double bboxWidth;

    @Column(name = "bbox_height")
    private Double bboxHeight;

    @Column(name = "page_width")
    private Double pageWidth;

    @Column(name = "page_height")
    private Double pageHeight;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
