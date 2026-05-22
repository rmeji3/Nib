-- Phase 2 closure: block-level provenance via bounding-box coordinates.
--
-- Each content_block (text chunk or visual_summary) gets a top-left
-- origin bounding box plus the page's own dimensions in PDF user units.
-- The frontend uses (bbox / page) to compute an overlay rectangle on
-- the rendered PDF page at any zoom level.
--
-- All columns are nullable so existing rows ingested before this migration
-- keep working — citations to old blocks fall back to text-layer search
-- highlighting on the frontend.
--
-- Coordinate system: top-left origin, Y axis pointing down (HTML/CSS style).
-- Backend converts from PDFBox's bottom-left origin during ingestion.
--
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor

ALTER TABLE content_blocks
    ADD COLUMN IF NOT EXISTS bbox_x      double precision,
    ADD COLUMN IF NOT EXISTS bbox_y      double precision,
    ADD COLUMN IF NOT EXISTS bbox_width  double precision,
    ADD COLUMN IF NOT EXISTS bbox_height double precision,
    ADD COLUMN IF NOT EXISTS page_width  double precision,
    ADD COLUMN IF NOT EXISTS page_height double precision;
