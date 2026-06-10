# Nib - Backend Development Guide

This is a live developer guide and project structure index for the Spring Boot Java backend. It is automatically scanned and updated by agents when changes are made.

---

## 1. Core Guidelines

### Directory & Package Structure
We follow the standard Controller-Service-Repository layers pattern under `com.nib.backend`:
- **`controller`**: REST controllers exposing endpoints. Always use `@RestController` and map under `/api/v1` (or `/api`).
- **`service`**: Business logic orchestration and transaction boundaries (`@Transactional`).
- **`repository`**: Spring Data JPA repositories.
- **`model`**: JPA database entity mapping.
- **`dto`**: Request/Response Data Transfer Objects using Java `record` classes.
- **`exception`**: Custom exceptions and `@RestControllerAdvice` global exception handling.
- **`config`**: Configuration Beans (Security, CORS, Jackson, WebMvc).

### Spring Boot Best Practices
- **Constructor Injection**: Always use constructor injection. Use `@RequiredArgsConstructor` on classes to inject dependencies automatically without using field-level `@Autowired`.
- **Java Records**: Use immutable `record` objects for DTO request/response payloads to minimize boilerplate.
- **Validation**: Enforce verification of request payloads using `jakarta.validation` annotations (e.g., `@NotNull`, `@NotBlank`, `@Size`) and add `@Valid` inside controller mappings.

### JPA & Database Performance
- **Lazy Loading**: Enforce `FetchType.LAZY` on all `@ManyToOne` and `@OneToOne` relations to avoid performance hits.
- **N+1 Avoidance**: Use `@EntityGraph` or JPQL `join fetch` in custom repository methods when loading entities with associations.
- **Transaction Optimizations**: Annotate read-only transactions with `@Transactional(readOnly = true)`. Do not place `@Transactional` on controllers.
- **Lombok Safety**: Avoid `@Data` on JPA entity classes to prevent lazy initialization exceptions or infinite recursion in `toString()`, `equals()`, or `hashCode()`. Override them manually if needed.

### Testing Requirements
- **Unit Testing**: Write tests for services and business classes using JUnit 5 and Mockito.
- **Controller Testing**: Test REST request serialization, deserialization, and HTTP codes using `@WebMvcTest` with `MockMvc`.
- **Repository Testing**: Verify custom JPA/JPQL queries using `@DataJpaTest`.
- **Mocks**: Mock all outgoing HTTP and AI client dependencies (such as OpenAI, Supabase API client) in tests.

---

## 2. Codebase Structure (Auto-Generated)

> [!NOTE]
> The section below is updated automatically when running `npm run update-guides`. Do not edit between the marker comments manually.

<!-- START_AUTO_MAP -->
### API Controller & Endpoints Map

#### Controller: [`AuthController`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/controller/AuthController.java)
| Verb | Endpoint Route |
| --- | --- |
| `POST` | `/api/v1/auth/register` |
| `POST` | `/api/v1/auth/authenticate` |

#### Controller: [`ChatController`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/controller/ChatController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/chat/sessions/document/{documentId}` |
| `GET` | `/api/v1/chat/sessions/{sessionId}/messages` |
| `POST` | `/api/v1/chat/sessions/{sessionId}/query` |

#### Controller: [`CollectionController`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/controller/CollectionController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/collections/{id}/documents` |
| `GET` | `/api/v1/collections` |
| `POST` | `/api/v1/collections/{id}/documents` |
| `POST` | `/api/v1/collections` |
| `DELETE` | `/api/v1/collections/{id}` |
| `DELETE` | `/api/v1/collections/{id}/documents/{documentId}` |
| `PATCH` | `/api/v1/collections/{id}` |

#### Controller: [`DocumentController`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/controller/DocumentController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/documents/trash` |
| `GET` | `/api/v1/documents/recent` |
| `GET` | `/api/v1/documents/starred` |
| `GET` | `/api/v1/documents/{id}` |
| `GET` | `/api/v1/documents/{id}/content` |
| `GET` | `/api/v1/documents` |
| `POST` | `/api/v1/documents/upload` |
| `POST` | `/api/v1/documents/{id}/open` |
| `POST` | `/api/v1/documents/{id}/restore` |
| `POST` | `/api/v1/documents/merge` |
| `DELETE` | `/api/v1/documents/{id}` |
| `DELETE` | `/api/v1/documents/{id}/permanent` |
| `PATCH` | `/api/v1/documents/{id}` |
| `PATCH` | `/api/v1/documents/{id}/star` |

#### Controller: [`IngestionController`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/controller/IngestionController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/documents/{id}/status` |
| `POST` | `/api/v1/documents/{id}/ingest` |

#### Controller: [`TestController`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/controller/TestController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/test/hello` |
| `POST` | `/api/v1/test/email` |

#### Controller: [`UserController`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/controller/UserController.java)
| Verb | Endpoint Route |
| --- | --- |
| `PUT` | `/api/v1/users/me/settings` |

### Database Entities (`backend/src/.../model`)

- [`ChatMessage`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/ChatMessage.java)
- [`ChatSession`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/ChatSession.java)
- [`Collection`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/Collection.java)
- [`CollectionDocument`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/CollectionDocument.java)
- [`ContentBlock`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/ContentBlock.java)
- [`Document`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/Document.java)
- [`IngestionJob`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/IngestionJob.java)
- [`IngestionStatus`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/IngestionStatus.java)
- [`User`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/User.java)

### Data Access Repositories (`backend/src/.../repository`)

- [`ChatMessageRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/ChatMessageRepository.java)
- [`ChatSessionRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/ChatSessionRepository.java)
- [`CollectionDocumentRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/CollectionDocumentRepository.java)
- [`CollectionRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/CollectionRepository.java)
- [`ContentBlockRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/ContentBlockRepository.java)
- [`DocumentRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/DocumentRepository.java)
- [`IngestionJobRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/IngestionJobRepository.java)
- [`UserRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/UserRepository.java)

### Business Services (`backend/src/.../service`)

- [`AuthService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/AuthService.java)
- [`ChatRateLimiter`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/ChatRateLimiter.java)
- [`ChatService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/ChatService.java)
- [`ChunkingService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/ChunkingService.java)
- [`CollectionService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/CollectionService.java)
- [`DocumentService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/DocumentService.java)
- [`EmbeddingService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/EmbeddingService.java)
- [`IngestionRunner`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/IngestionRunner.java)
- [`IngestionService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/IngestionService.java)
- [`JwtService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/JwtService.java)
- [`PositionedTextExtractor`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/PositionedTextExtractor.java)
- [`SupabaseStorageService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/SupabaseStorageService.java)
- [`TestIService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/TestIService.java)
- [`TestService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/TestService.java)
- [`TextExtractionService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/TextExtractionService.java)
- [`UserService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/UserService.java)
- [`VectorSearchService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/VectorSearchService.java)
- [`VisionService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/VisionService.java)

### Data Transfer Objects (`backend/src/.../dto`)

- [`AddToCollectionRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/AddToCollectionRequest.java)
- [`AuthRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/AuthRequest.java)
- [`AuthResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/AuthResponse.java)
- [`BBox`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/BBox.java)
- [`ChatMessageResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatMessageResponse.java)
- [`ChatQueryRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatQueryRequest.java)
- [`ChatQueryResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatQueryResponse.java)
- [`ChatSessionResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatSessionResponse.java)
- [`CitationDto`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/CitationDto.java)
- [`CollectionSummary`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/CollectionSummary.java)
- [`CreateCollectionRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/CreateCollectionRequest.java)
- [`DocumentResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/DocumentResponse.java)
- [`GroundingVerificationDto`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/GroundingVerificationDto.java)
- [`IngestionIssueDto`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/IngestionIssueDto.java)
- [`IngestionStatusResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/IngestionStatusResponse.java)
- [`PagedResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/PagedResponse.java)
- [`RegisterRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/RegisterRequest.java)
- [`RenameRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/RenameRequest.java)
- [`TestRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/TestRequest.java)
- [`TestResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/TestResponse.java)
- [`UserSettingsRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/UserSettingsRequest.java)


<!-- END_AUTO_MAP -->

---

## 3. Agent Changelog & Decisions

This section is maintained by AI coding agents to track architectural updates, entity changes, or pattern adjustments. When adding new endpoints or entities, append an entry to the log below.

### Log
- **2026-06-10**: Added deterministic post-answer grounding verification. `ChatQueryResponse` now includes `GroundingVerificationDto`, which reports `verified`, `verdict`, `score`, checked/cited sentence counts, uncited factual-looking claims, unmapped citations, and cited block IDs. `ChatService` runs this after answer generation using the richer `[B#]` source metadata; it validates citation coverage and source mapping while keeping the existing `groundedness` score for continuity.
- **2026-06-10**: Made ingestion retries more durable. `IngestionService.createAndTrigger()` now returns a healthy active `PROCESSING` job instead of duplicating work, marks stale `PROCESSING` jobs as `FAILED` after `ingestion.job.stale-after-minutes` (default 60), and creates a fresh retry job so documents do not remain blocked forever after worker crashes or app restarts. The status API now includes `retryable`, and async worker launch failures are persisted back onto the job as `FAILED` with an error message.
- **2026-06-10**: Added structured partial-ingestion visibility to the status API. `IngestionStatusResponse` now includes `hasPartialFailures` and an `issues` list of `IngestionIssueDto` rows (`pageNumber`, `stage`, `severity`, `message`) parsed from persisted warnings, while retaining `pagesFailed` and `warningMessage` for compatibility. `IngestionRunner` now clears stale warning/error fields at retry start and records an explicit warning when visual analysis is disabled so users are not told ingestion is fully complete while charts, figures, or image-only evidence were skipped.
- **2026-06-10**: Upgraded chat citations from page-only prompts to exact source-block prompts. `ChatService` now labels retrieved context as `Source B#` with page, block UUID, block type, chunk index, and bbox metadata, asks the model to cite `[B#]`, maps those citations back to `content_blocks.id`, and keeps legacy `[Page N]` citation parsing as a fallback. `CitationDto` now includes `sourceId`, `documentId`, and `chunkIndex` for richer provenance while retaining text/visual evidence and bbox overlay fields.
- **2026-06-10**: Started Phase 1 backend trust hardening. `CitationDto` now carries block-level provenance (`blockId`, `blockType`, `evidenceType`, `textBlockId`, `visualBlockId`) while preserving existing excerpt/summary/bbox fields. `IngestionJob` and `IngestionStatusResponse` now expose partial-ingestion visibility via `pagesFailed` and `warningMessage`; `IngestionRunner` records page-level Gemini Vision failures without marking the whole job failed, and `DatabaseMigrationRunner` adds the new columns idempotently. Added mocked-provider tests for Mistral embeddings, Gemini Vision parsing, chat low-confidence refusal, citation provenance extraction, and ingestion warning status.
- **2026-05-24**: Phase 4 Tiers 1–3 implementation. **Tier 1 — Hybrid Search**: `VectorSearchService` gains `hybridSearch()` combining pgvector cosine distance with BM25 full-text (tsvector/tsquery) via Reciprocal Rank Fusion (RRF, k=60). New `HybridSearchResult` record returns merged chunks + raw vector results for confidence scoring. `fullTextSearch()` uses `ts_rank_cd` + `plainto_tsquery`. New `DatabaseMigrationRunner` runs idempotent schema migrations on startup (tsvector column, GIN index, auto-populate trigger). **Tier 1 — Dynamic TopK**: `ChatService.computeDynamicTopK()` scales topK per document page count — `clamp(pages*1.5, 5, 20)`. Injected `IngestionJobRepository`. **Tier 1 — Chunk Overlap**: bumped from 10% to 15% (300/2000 chars). **Tier 2 — Multi-Turn Query Rewriting**: `ChatService.rewriteQueryIfNeeded()` detects prior conversation turns and calls Gemini to rewrite follow-up questions as standalone queries before embedding. `ChatMessageRepository` gains `findBySessionIdOrderByCreatedAtDesc(sessionId, Pageable)`. **Tier 3 — Document-Type Classification**: `IngestionRunner.extractDocType()` parses the `TYPE:` line from the document summary to classify docs as academic/financial/menu/technical/legal/catalog/mixed. Persists to `Document.docType` (new nullable column). **Tier 3 — Type-Aware Prompting**: `ChatService.buildPrompt()` now accepts `docType` and injects document-type-specific instructions (price precision for menus, figure references for academic papers, clause references for legal docs, etc.).
- **2026-05-22**: Phase 3 accuracy hardening. `ChatService` extended with: `rerank()` (visual boost +0.10 / per-page diversity penalty -0.05), `computeConfidence()` (1 - mean cosine distance of top-3 chunks, clamped to [0,1]), `computeGroundedness()` (fraction of answer sentences containing `[Page N]`), and a refusal guard that returns a canned "not enough info" answer when confidence falls below `chat.refusal.threshold` (default 0.25) and the query isn't an aggregation query. Prompt rule #3 added: every factual sentence MUST end with a `[Page X]` citation. `ChatQueryResponse` extended with `confidence`, `groundedness`, `refused`. `IngestionRunner.updateProgress()` writes `pages_processed` to `ingestion_jobs` after each Gemini Vision task completes (via `CompletableFuture#whenComplete`), giving the frontend real-time progress instead of a single end-of-run jump. New tunables in `application.properties`: `chat.refusal.threshold`, `chat.rerank.visual-boost`, `chat.rerank.diversity-penalty`.
- **2026-05-20**: Renamed package structure from `com.aipdfviewer.backend` to `com.nib.backend`. Removed deprecated `spring.jackson.serialization.WRITE_DATES_AS_TIMESTAMPS` config due to Jackson 3/Spring Boot 4.0.6 upgrade compatibility. Moved JWT Secret Key to environment variable `JWT_SECRET_KEY` in `.env` and loaded it dynamically in `application.properties` with a newly generated cryptographically secure 256-bit key.
- **2026-05-20**: Added collections service. New: `Collection` + `CollectionDocument` entities, `CollectionRepository`, `CollectionDocumentRepository`, `CollectionSummary`/`CreateCollectionRequest`/`AddToCollectionRequest` DTOs, `CollectionService`, `CollectionController`. `CollectionDocument` uses `@OnDelete(CASCADE)` on both FKs for DB-level cascade cleanup. `CollectionNotFoundException` + handler in `GlobalExceptionHandler`. Endpoints: CRUD on collections + add/remove/list documents per collection.
- **2026-05-20**: Added recent documents feature. New: `lastOpenedAt` field on `Document` entity, `GET /api/v1/documents/recent` endpoint returning docs ordered by `lastOpenedAt DESC`, `POST /api/v1/documents/{id}/open` endpoint that stamps `lastOpenedAt` via a direct JPQL `@Modifying` query (avoids triggering `@PreUpdate` on `updatedAt`). Updated `DocumentResponse` DTO to include `lastOpenedAt`. Updated `DocumentRepository` with `findByUserAndLastOpenedAtIsNotNullAndDeletedAtIsNullOrderByLastOpenedAtDesc` and `updateLastOpenedAt` methods.
- **2026-05-20**: Phase 1 RAG pipeline implemented. New: `ContentBlock`, `IngestionJob`, `ChatSession`, `ChatMessage` entities + repositories; `TextExtractionService` (PDFBox), `ChunkingService` (sliding window, 2000 char / 200 overlap), `EmbeddingService` (Mistral `mistral-embed`, float[1024]), `VectorSearchService` (JdbcTemplate → pgvector match_chunks()), `IngestionService` (@Async orchestrator), `ChatService` (Gemini 2.0 Flash RAG loop with [Page X] citation parsing); `IngestionController` + `ChatController`; `AsyncConfig` (ingestionExecutor 4/8 threads); `ObjectMapper` bean added to `ApplicationConfig`; `DocumentService.uploadDocuments()` now auto-triggers ingestion after save. API keys: `MISTRAL_API_KEY`, `GEMINI_API_KEY` required in `.env`.
- **2026-05-20**: Created the initial `GUIDE.md` skeleton and implemented the guide update automation script.
- **2026-05-19**: Added document upload, listing, and PDF merge. New: `Document` entity, `DocumentRepository`, `DocumentResponse` DTO, `DocumentController` (`POST /upload`, `GET /`, `POST /merge`), `DocumentService`, `SupabaseStorageService` (Supabase Storage REST via `RestClient`), `GlobalExceptionHandler`, and exception types. Updated: `pom.xml` (added PDFBox 3.0.3), `application.properties` (Supabase Storage config, multipart limits 50 MB, Jackson ISO dates), `ApplicationConfig` (added `RestClient` bean). Supabase Storage bucket name configurable via `SUPABASE_STORAGE_BUCKET` env var (default: `documents`). Signed URLs valid for 1 hour.
- **2026-05-20**: Fixed bug where trashed document previews failed to load by changing getDocumentContent to no longer check if deletedAt is null.
