package com.nib.backend.dto;

import java.util.UUID;

/**
 * One cited evidence source in an assistant message. {@link #sourceId} is the
 * stable prompt-local label (for example "B3") that maps the answer citation
 * back to a specific retrieved {@code content_blocks} row via {@link #blockId}.
 * The frontend uses {@link #bbox} + {@link #pageWidth}/{@link #pageHeight} to
 * draw a precise highlight overlay on the rendered PDF, and shows
 * {@link #textExcerpt} + {@link #visualSummary} side-by-side in the evidence
 * drawer.
 *
 * Any of the optional fields may be null:
 *  - textExcerpt is null when no usable text block exists for the page
 *    (character-spaced fonts, image-only pages)
 *  - visualSummary is null when vision analysis was disabled or failed
 *  - bbox + pageWidth/pageHeight are null for blocks ingested before the
 *    bbox migration; the viewer falls back to text-layer search highlighting
 */
public record CitationDto(
        int pageNumber,
        String sourceId,
        UUID blockId,
        UUID documentId,
        String blockType,
        Integer chunkIndex,
        String evidenceType,
        String textExcerpt,
        UUID textBlockId,
        String visualSummary,
        UUID visualBlockId,
        BBox bbox,
        Double pageWidth,
        Double pageHeight
) {}
