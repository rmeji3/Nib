package com.nib.backend.dto;

/**
 * One cited page in an assistant message. The frontend uses {@link #bbox}
 * + {@link #pageWidth}/{@link #pageHeight} to draw a precise highlight
 * overlay on the rendered PDF, and shows {@link #textExcerpt} +
 * {@link #visualSummary} side-by-side in the evidence drawer.
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
        String textExcerpt,
        String visualSummary,
        BBox bbox,
        Double pageWidth,
        Double pageHeight
) {}
