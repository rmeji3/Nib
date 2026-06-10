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

    @Column(name = "visual_summary", columnDefinition = "TEXT")
    private String visualSummary;

    @Column(name = "table_structure", columnDefinition = "jsonb")
    private String tableStructure;

    @Column(name = "chart_summary", columnDefinition = "TEXT")
    private String chartSummary;

    @Column(name = "axis_labels", columnDefinition = "jsonb")
    private String axisLabels;

    @Column(name = "units", columnDefinition = "jsonb")
    private String units;

    @Column(name = "data_points", columnDefinition = "jsonb")
    private String dataPoints;

    @Column(name = "figure_crop_path")
    private String figureCropPath;

    @Column(name = "figure_caption", columnDefinition = "TEXT")
    private String figureCaption;

    @Column(name = "extraction_metadata", columnDefinition = "jsonb")
    private String extractionMetadata;

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
