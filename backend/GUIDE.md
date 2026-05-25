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

#### Controller: [`AuthController`](file:///C:/Users/haide/Documents/Coding Projects/Working Projects/Nib/backend/src/main/java/com/nib/backend/controller/AuthController.java)
| Verb | Endpoint Route |
| --- | --- |
| `POST` | `/api/v1/auth/register` |
| `POST` | `/api/v1/auth/authenticate` |

<<<<<<< HEAD
#### Controller: [`CollectionController`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/controller/CollectionController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/collections/{id}/documents` |
| `GET` | `/api/v1/collections` |
| `POST` | `/api/v1/collections/{id}/documents` |
| `POST` | `/api/v1/collections` |
| `DELETE` | `/api/v1/collections/{id}` |
| `DELETE` | `/api/v1/collections/{id}/documents/{documentId}` |
| `PATCH` | `/api/v1/collections/{id}` |

#### Controller: [`DocumentController`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/controller/DocumentController.java)
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

#### Controller: [`IngestionController`](file:///C:/Users/haide/Documents/Coding Projects/Working Projects/Nib/backend/src/main/java/com/nib/backend/controller/IngestionController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/documents/{id}/status` |
| `POST` | `/api/v1/documents/{id}/ingest` |

#### Controller: [`TestController`](file:///C:/Users/haide/Documents/Coding Projects/Working Projects/Nib/backend/src/main/java/com/nib/backend/controller/TestController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/test/hello` |
| `POST` | `/api/v1/test/email` |

### Database Entities (`backend/src/.../model`)
- [`Collection`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/model/Collection.java)
- [`CollectionDocument`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/model/CollectionDocument.java)
- [`Document`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/model/Document.java)
- [`User`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/model/User.java)

### Data Access Repositories (`backend/src/.../repository`)

- [`CollectionDocumentRepository`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/repository/CollectionDocumentRepository.java)
- [`CollectionRepository`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/repository/CollectionRepository.java)
- [`DocumentRepository`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/repository/DocumentRepository.java)
- [`UserRepository`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/repository/UserRepository.java)

### Business Services (`backend/src/.../service`)

- [`AuthService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/AuthService.java)
- [`CollectionService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/CollectionService.java)
- [`DocumentService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/DocumentService.java)
- [`JwtService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/JwtService.java)
- [`SupabaseStorageService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/SupabaseStorageService.java)
- [`TestIService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/TestIService.java)
- [`TestService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/TestService.java)

### Data Transfer Objects (`backend/src/.../dto`)

- [`AddToCollectionRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/AddToCollectionRequest.java)
- [`AuthRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/AuthRequest.java)
- [`AuthResponse`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/AuthResponse.java)
- [`CollectionSummary`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/CollectionSummary.java)
- [`CreateCollectionRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/CreateCollectionRequest.java)
- [`DocumentResponse`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/DocumentResponse.java)
- [`PagedResponse`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/PagedResponse.java)
- [`RegisterRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/RegisterRequest.java)
- [`RenameRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/RenameRequest.java)
- [`TestRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/TestRequest.java)
- [`TestResponse`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/TestResponse.java)



<!-- END_AUTO_MAP -->

---

## 3. Agent Changelog & Decisions

This section is maintained by AI coding agents to track architectural updates, entity changes, or pattern adjustments. When adding new endpoints or entities, append an entry to the log below.

### Log
- **2026-05-24**: Phase 4 Tiers 1–3 implementation. **Tier 1 — Hybrid Search**: `VectorSearchService` gains `hybridSearch()` combining pgvector cosine distance with BM25 full-text (tsvector/tsquery) via Reciprocal Rank Fusion (RRF, k=60). New `HybridSearchResult` record returns merged chunks + raw vector results for confidence scoring. `fullTextSearch()` uses `ts_rank_cd` + `plainto_tsquery`. New `DatabaseMigrationRunner` runs idempotent schema migrations on startup (tsvector column, GIN index, auto-populate trigger). **Tier 1 — Dynamic TopK**: `ChatService.computeDynamicTopK()` scales topK per document page count — `clamp(pages*1.5, 5, 20)`. Injected `IngestionJobRepository`. **Tier 1 — Chunk Overlap**: bumped from 10% to 15% (300/2000 chars). **Tier 2 — Multi-Turn Query Rewriting**: `ChatService.rewriteQueryIfNeeded()` detects prior conversation turns and calls Gemini to rewrite follow-up questions as standalone queries before embedding. `ChatMessageRepository` gains `findBySessionIdOrderByCreatedAtDesc(sessionId, Pageable)`. **Tier 3 — Document-Type Classification**: `IngestionRunner.extractDocType()` parses the `TYPE:` line from the document summary to classify docs as academic/financial/menu/technical/legal/catalog/mixed. Persists to `Document.docType` (new nullable column). **Tier 3 — Type-Aware Prompting**: `ChatService.buildPrompt()` now accepts `docType` and injects document-type-specific instructions (price precision for menus, figure references for academic papers, clause references for legal docs, etc.).
- **2026-05-22**: Phase 3 accuracy hardening. `ChatService` extended with: `rerank()` (visual boost +0.10 / per-page diversity penalty -0.05), `computeConfidence()` (1 - mean cosine distance of top-3 chunks, clamped to [0,1]), `computeGroundedness()` (fraction of answer sentences containing `[Page N]`), and a refusal guard that returns a canned "not enough info" answer when confidence falls below `chat.refusal.threshold` (default 0.25) and the query isn't an aggregation query. Prompt rule #3 added: every factual sentence MUST end with a `[Page X]` citation. `ChatQueryResponse` extended with `confidence`, `groundedness`, `refused`. `IngestionRunner.updateProgress()` writes `pages_processed` to `ingestion_jobs` after each Gemini Vision task completes (via `CompletableFuture#whenComplete`), giving the frontend real-time progress instead of a single end-of-run jump. New tunables in `application.properties`: `chat.refusal.threshold`, `chat.rerank.visual-boost`, `chat.rerank.diversity-penalty`.
- **2026-05-20**: Renamed package structure from `com.aipdfviewer.backend` to `com.nib.backend`. Removed deprecated `spring.jackson.serialization.WRITE_DATES_AS_TIMESTAMPS` config due to Jackson 3/Spring Boot 4.0.6 upgrade compatibility. Moved JWT Secret Key to environment variable `JWT_SECRET_KEY` in `.env` and loaded it dynamically in `application.properties` with a newly generated cryptographically secure 256-bit key.
- **2026-05-20**: Added collections service. New: `Collection` + `CollectionDocument` entities, `CollectionRepository`, `CollectionDocumentRepository`, `CollectionSummary`/`CreateCollectionRequest`/`AddToCollectionRequest` DTOs, `CollectionService`, `CollectionController`. `CollectionDocument` uses `@OnDelete(CASCADE)` on both FKs for DB-level cascade cleanup. `CollectionNotFoundException` + handler in `GlobalExceptionHandler`. Endpoints: CRUD on collections + add/remove/list documents per collection.
- **2026-05-20**: Added recent documents feature. New: `lastOpenedAt` field on `Document` entity, `GET /api/v1/documents/recent` endpoint returning docs ordered by `lastOpenedAt DESC`, `POST /api/v1/documents/{id}/open` endpoint that stamps `lastOpenedAt` via a direct JPQL `@Modifying` query (avoids triggering `@PreUpdate` on `updatedAt`). Updated `DocumentResponse` DTO to include `lastOpenedAt`. Updated `DocumentRepository` with `findByUserAndLastOpenedAtIsNotNullAndDeletedAtIsNullOrderByLastOpenedAtDesc` and `updateLastOpenedAt` methods.
- **2026-05-20**: Phase 1 RAG pipeline implemented. New: `ContentBlock`, `IngestionJob`, `ChatSession`, `ChatMessage` entities + repositories; `TextExtractionService` (PDFBox), `ChunkingService` (sliding window, 2000 char / 200 overlap), `EmbeddingService` (Mistral `mistral-embed`, float[1024]), `VectorSearchService` (JdbcTemplate → pgvector match_chunks()), `IngestionService` (@Async orchestrator), `ChatService` (Gemini 2.0 Flash RAG loop with [Page X] citation parsing); `IngestionController` + `ChatController`; `AsyncConfig` (ingestionExecutor 4/8 threads); `ObjectMapper` bean added to `ApplicationConfig`; `DocumentService.uploadDocuments()` now auto-triggers ingestion after save. API keys: `MISTRAL_API_KEY`, `GEMINI_API_KEY` required in `.env`.
- **2026-05-20**: Created the initial `GUIDE.md` skeleton and implemented the guide update automation script.
- **2026-05-19**: Added document upload, listing, and PDF merge. New: `Document` entity, `DocumentRepository`, `DocumentResponse` DTO, `DocumentController` (`POST /upload`, `GET /`, `POST /merge`), `DocumentService`, `SupabaseStorageService` (Supabase Storage REST via `RestClient`), `GlobalExceptionHandler`, and exception types. Updated: `pom.xml` (added PDFBox 3.0.3), `application.properties` (Supabase Storage config, multipart limits 50 MB, Jackson ISO dates), `ApplicationConfig` (added `RestClient` bean). Supabase Storage bucket name configurable via `SUPABASE_STORAGE_BUCKET` env var (default: `documents`). Signed URLs valid for 1 hour.
- **2026-05-20**: Fixed bug where trashed document previews failed to load by changing getDocumentContent to no longer check if deletedAt is null.
