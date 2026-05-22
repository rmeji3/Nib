package com.nib.backend.dto;

/**
 * Axis-aligned bounding box in PDF user units, top-left origin (CSS-style).
 * Used to anchor a content block to a region on the rendered PDF page.
 */
public record BBox(
        double x,
        double y,
        double width,
        double height
) {}
