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

#### Controller: `AuthController`
| Verb | Endpoint Route |
| --- | --- |
| `POST` | `/api/v1/auth/register` |
| `POST` | `/api/v1/auth/authenticate` |

#### Controller: `DocumentController`
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/documents` |
| `POST` | `/api/v1/documents/upload` |
| `POST` | `/api/v1/documents/merge` |
| `GET` | `/api/v1/documents/{id}` |
| `PATCH` | `/api/v1/documents/{id}` |
| `DELETE` | `/api/v1/documents/{id}` |
| `PATCH` | `/api/v1/documents/{id}/star` |
| `POST` | `/api/v1/documents/{id}/restore` |
| `DELETE` | `/api/v1/documents/{id}/permanent` |
| `GET` | `/api/v1/documents/trash` |
| `GET` | `/api/v1/documents/starred` |

#### Controller: `IngestionController` *(Phase 1)*
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/documents/{id}/status` |
| `POST` | `/api/v1/documents/{id}/ingest` |

#### Controller: `ChatController` *(Phase 1)*
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/chat/sessions/document/{documentId}` |
| `POST` | `/api/v1/chat/sessions/{sessionId}/query` |
| `GET` | `/api/v1/chat/sessions/{sessionId}/messages` |

#### Controller: `TestController`
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/test/hello` |
| `POST` | `/api/v1/test/email` |

### Database Entities (`backend/src/.../model`)

- `Document`
- `User`
- `ContentBlock` *(Phase 1)* — per-page text chunks
- `IngestionJob` *(Phase 1)* — async pipeline status tracking
- `ChatSession` *(Phase 1)* — conversation thread per document
- `ChatMessage` *(Phase 1)* — individual chat turns with JSONB citations
- `IngestionStatus` *(Phase 1)* — enum: PENDING, PROCESSING, COMPLETE, FAILED

### Data Access Repositories (`backend/src/.../repository`)

- `DocumentRepository`
- `UserRepository`
- `ContentBlockRepository` *(Phase 1)*
- `IngestionJobRepository` *(Phase 1)*
- `ChatSessionRepository` *(Phase 1)*
- `ChatMessageRepository` *(Phase 1)*

### Business Services (`backend/src/.../service`)

- `AuthService`
- `DocumentService` — triggers ingestion automatically on upload
- `JwtService`
- `SupabaseStorageService`
- `TextExtractionService` *(Phase 1)* — PDFBox page-by-page text extraction
- `ChunkingService` *(Phase 1)* — sliding-window character chunker (~500 tokens)
- `EmbeddingService` *(Phase 1)* — Mistral `mistral-embed` API, returns float[1024]
- `VectorSearchService` *(Phase 1)* — JdbcTemplate pgvector insert + match_chunks() search
- `IngestionService` *(Phase 1)* — @Async orchestrator; PENDING→PROCESSING→COMPLETE/FAILED
- `ChatService` *(Phase 1)* — RAG loop: embed question → pgvector search → Gemini 2.0 Flash → citations

### Data Transfer Objects (`backend/src/.../dto`)

- `AuthRequest`, `AuthResponse`, `RegisterRequest`
- `DocumentResponse`, `PagedResponse`, `RenameRequest`
- `IngestionStatusResponse` *(Phase 1)*
- `CitationDto` *(Phase 1)* — `{ pageNumber, excerpt }`
- `ChatQueryRequest` *(Phase 1)*
- `ChatQueryResponse` *(Phase 1)*
- `ChatMessageResponse` *(Phase 1)*
- `ChatSessionResponse` *(Phase 1)*

### Config (`backend/src/.../config`)

- `ApplicationConfig` — auth beans + RestClient + ObjectMapper
- `AsyncConfig` *(Phase 1)* — `ingestionExecutor` thread pool (4 core / 8 max)
- `SecurityConfig` — JWT filter chain + CORS
- `JwtAuthFilter`

<!-- END_AUTO_MAP -->

---

## 3. Agent Changelog & Decisions

This section is maintained by AI coding agents to track architectural updates, entity changes, or pattern adjustments. When adding new endpoints or entities, append an entry to the log below.

### Log
- **2026-05-20**: Renamed package structure from `com.aipdfviewer.backend` to `com.nib.backend`. Removed deprecated `spring.jackson.serialization.WRITE_DATES_AS_TIMESTAMPS` config due to Jackson 3/Spring Boot 4.0.6 upgrade compatibility. Moved JWT Secret Key to environment variable `JWT_SECRET_KEY` in `.env` and loaded it dynamically in `application.properties` with a newly generated cryptographically secure 256-bit key.
- **2026-05-20**: Phase 1 RAG pipeline implemented. New: `ContentBlock`, `IngestionJob`, `ChatSession`, `ChatMessage` entities + repositories; `TextExtractionService` (PDFBox), `ChunkingService` (sliding window, 2000 char / 200 overlap), `EmbeddingService` (Mistral `mistral-embed`, float[1024]), `VectorSearchService` (JdbcTemplate → pgvector match_chunks()), `IngestionService` (@Async orchestrator), `ChatService` (Gemini 2.0 Flash RAG loop with [Page X] citation parsing); `IngestionController` + `ChatController`; `AsyncConfig` (ingestionExecutor 4/8 threads); `ObjectMapper` bean added to `ApplicationConfig`; `DocumentService.uploadDocuments()` now auto-triggers ingestion after save. API keys: `MISTRAL_API_KEY`, `GEMINI_API_KEY` required in `.env`.
- **2026-05-20**: Created the initial `GUIDE.md` skeleton and implemented the guide update automation script.
- **2026-05-19**: Added document upload, listing, and PDF merge. New: `Document` entity, `DocumentRepository`, `DocumentResponse` DTO, `DocumentController` (`POST /upload`, `GET /`, `POST /merge`), `DocumentService`, `SupabaseStorageService` (Supabase Storage REST via `RestClient`), `GlobalExceptionHandler`, and exception types. Updated: `pom.xml` (added PDFBox 3.0.3), `application.properties` (Supabase Storage config, multipart limits 50 MB, Jackson ISO dates), `ApplicationConfig` (added `RestClient` bean). Supabase Storage bucket name configurable via `SUPABASE_STORAGE_BUCKET` env var (default: `documents`). Signed URLs valid for 1 hour.
