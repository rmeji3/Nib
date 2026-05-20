-- Phase 1: RAG Pipeline Schema
-- Creates the tables needed for text extraction, chunking, embeddings, and chat.

-- Enable pgvector if not already enabled
create extension if not exists vector;

-- ── Content Blocks ────────────────────────────────────────────────────────────
-- Stores extracted text chunks per page from each document.
-- block_type: 'text' in Phase 1; 'table' | 'image' | 'chart' in Phase 2.
create table if not exists content_blocks (
    id          uuid primary key default gen_random_uuid(),
    document_id uuid not null references documents(id) on delete cascade,
    page_number integer not null,
    block_type  text not null default 'text' check (block_type in ('text', 'table', 'image', 'chart')),
    chunk_index integer not null,
    extracted_text text not null,
    token_count integer,
    created_at  timestamptz not null default now()
);

create index if not exists idx_content_blocks_document_id on content_blocks(document_id);
create index if not exists idx_content_blocks_page_number on content_blocks(document_id, page_number);

-- ── Embeddings ────────────────────────────────────────────────────────────────
-- One embedding vector per content block. Dimension 1024 (Mistral embed).
create table if not exists embeddings (
    id              uuid primary key default gen_random_uuid(),
    block_id        uuid not null references content_blocks(id) on delete cascade,
    embedding       vector(1024) not null,
    model_version   text not null default 'mistral-embed',
    created_at      timestamptz not null default now()
);

-- IVFFlat index for approximate nearest-neighbour search (cosine similarity).
-- Lists = sqrt(expected row count). Adjust after data grows.
create index if not exists idx_embeddings_vector
    on embeddings using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- ── Ingestion Jobs ────────────────────────────────────────────────────────────
-- Tracks the async extraction + embedding pipeline per document.
create table if not exists ingestion_jobs (
    id              uuid primary key default gen_random_uuid(),
    document_id     uuid not null references documents(id) on delete cascade,
    status          text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
    pages_total     integer,
    pages_processed integer not null default 0,
    error_message   text,
    started_at      timestamptz,
    completed_at    timestamptz,
    created_at      timestamptz not null default now()
);

create index if not exists idx_ingestion_jobs_document_id on ingestion_jobs(document_id);
create index if not exists idx_ingestion_jobs_status on ingestion_jobs(status);

-- ── Chat Sessions ─────────────────────────────────────────────────────────────
-- One session per user-document conversation thread.
create table if not exists chat_sessions (
    id          uuid primary key default gen_random_uuid(),
    document_id uuid not null references documents(id) on delete cascade,
    user_id     uuid not null references users(id) on delete cascade,
    title       text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists idx_chat_sessions_document_id on chat_sessions(document_id);
create index if not exists idx_chat_sessions_user_id on chat_sessions(user_id);

-- ── Chat Messages ─────────────────────────────────────────────────────────────
-- Persists every turn in a chat session.
-- citations is a JSONB array: [{ "pageNumber": 3, "blockId": "...", "excerpt": "..." }]
create table if not exists chat_messages (
    id          uuid primary key default gen_random_uuid(),
    session_id  uuid not null references chat_sessions(id) on delete cascade,
    role        text not null check (role in ('user', 'assistant')),
    content     text not null,
    citations   jsonb,
    model_version text,
    created_at  timestamptz not null default now()
);

create index if not exists idx_chat_messages_session_id on chat_messages(session_id);

-- ── pgvector similarity search helper ────────────────────────────────────────
-- Retrieves top-k content blocks by cosine similarity to a query embedding.
-- Called from Spring Boot via: SELECT * FROM match_chunks($1::vector, $2, $3)
create or replace function match_chunks(
    query_embedding vector(1024),
    match_count     integer,
    filter_doc_id   uuid
)
returns table (
    block_id        uuid,
    document_id     uuid,
    page_number     integer,
    chunk_index     integer,
    extracted_text  text,
    similarity      float
)
language sql stable
as $$
    select
        cb.id         as block_id,
        cb.document_id,
        cb.page_number,
        cb.chunk_index,
        cb.extracted_text,
        1 - (e.embedding <=> query_embedding) as similarity
    from embeddings e
    join content_blocks cb on cb.id = e.block_id
    where cb.document_id = filter_doc_id
    order by e.embedding <=> query_embedding
    limit match_count;
$$;
