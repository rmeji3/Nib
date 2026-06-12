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
| `GET` | `/api/v1/chat/sessions/document/{documentId}/all` |
| `GET` | `/api/v1/chat/sessions/document/{documentId}/starters` |
| `GET` | `/api/v1/chat/sessions/{sessionId}/messages` |
| `POST` | `/api/v1/chat/sessions/document/{documentId}` |
| `POST` | `/api/v1/chat/sessions/{sessionId}/query` |
| `POST` | `/api/v1/chat/messages/{messageId}/feedback` |
| `DELETE` | `/api/v1/chat/messages/{messageId}` |
| `DELETE` | `/api/v1/chat/sessions/{sessionId}` |

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
| `GET` | `/api/v1/users/me/cost-dashboard` |
| `PUT` | `/api/v1/users/me/settings` |

### Database Entities (`backend/src/.../model`)

- [`AnswerAudit`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/AnswerAudit.java)
- [`ChatMessage`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/ChatMessage.java)
- [`ChatMessageFeedback`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/ChatMessageFeedback.java)
- [`ChatSession`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/ChatSession.java)
- [`Collection`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/Collection.java)
- [`CollectionDocument`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/CollectionDocument.java)
- [`ContentBlock`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/ContentBlock.java)
- [`Document`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/Document.java)
- [`IngestionJob`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/IngestionJob.java)
- [`IngestionStatus`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/IngestionStatus.java)
- [`User`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/model/User.java)

### Data Access Repositories (`backend/src/.../repository`)

- [`AnswerAuditRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/AnswerAuditRepository.java)
- [`ChatMessageFeedbackRepository`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/repository/ChatMessageFeedbackRepository.java)
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
- [`CitationVerifier`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/CitationVerifier.java)
- [`CollectionService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/CollectionService.java)
- [`CostTelemetryService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/CostTelemetryService.java)
- [`DocumentService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/DocumentService.java)
- [`EmbeddingService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/EmbeddingService.java)
- [`GeminiTextClient`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/GeminiTextClient.java)
- [`IngestionRunner`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/IngestionRunner.java)
- [`IngestionService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/IngestionService.java)
- [`JwtService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/JwtService.java)
- [`PositionedTextExtractor`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/PositionedTextExtractor.java)
- [`PromptInjectionGuard`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/PromptInjectionGuard.java)
- [`RagChatTracer`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/RagChatTracer.java)
- [`RerankerService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/RerankerService.java)
- [`SemanticCacheService`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/SemanticCacheService.java)
- [`SlidingWindowRateLimiter`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/service/SlidingWindowRateLimiter.java)
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
- [`ChatMessageFeedbackRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatMessageFeedbackRequest.java)
- [`ChatMessageResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatMessageResponse.java)
- [`ChatQueryRequest`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatQueryRequest.java)
- [`ChatQueryResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatQueryResponse.java)
- [`ChatSessionResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatSessionResponse.java)
- [`ChatStarterResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/ChatStarterResponse.java)
- [`CitationDto`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/CitationDto.java)
- [`CollectionSummary`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/CollectionSummary.java)
- [`CostDashboardResponse`](file:////Users/rmeji/Desktop/Coding/Nib/backend/src/main/java/com/nib/backend/dto/CostDashboardResponse.java)
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
- **2026-06-10**: Fixed three retrieval-quality bugs found by trace-debugging the first live eval run (9/13 → 13/13 pass). (1) **Chunking tail bug (root cause of most failures)**: `ChunkingService` `chunk()`/`chunkWithPositions()` never terminated cleanly at end-of-text — `start = max(end - overlap, start + 1)` pinned behind the text end and emitted one suffix fragment per overlap character, creating ~300 junk chunks ("ing.", "ng.", "g.") per text block over 2000 chars, each embedded and indexed, drowning real content in hybrid retrieval. Both loops now stop when the window reaches end-of-text; added `ChunkingServiceTest`. Documents ingested before this fix still carry junk chunks and should be re-ingested or cleaned up. (2) **Cross-encoder relevance floor**: terse queries ("what uni?") make the reranker score all candidates ~0.05 and its ordering becomes noise; `RerankerService` now returns empty (keeping bi-encoder order) when the best candidate scores under `reranker.min-top-relevance` (default 0.10). (3) **No-information answers are refusals**: `ChatService` now classifies an uncited "cannot find this information" generation as refused (confidence 0.0, audit refused=true, trace outcome `no_information`) instead of returning refused=false with misleading mid-range confidence.
- **2026-06-10**: Added LLM tracing for the chat RAG pipeline. New `RagChatTracer` emits one OpenTelemetry trace per chat question with child spans for rewrite, retrieval, rerank, generation, and verification (GenAI + `langfuse.observation.*` attributes, payload truncation, and a `RAG_TRACING_INCLUDE_PAYLOADS=false` redaction switch). `ChatService.query()` records each stage and tags every terminal outcome (`answered`, `verifier_refused`, `cache_hit`, `refused_low_confidence`, `clarification`, `model_unavailable`). Export uses Spring Boot 4's `spring-boot-starter-opentelemetry` over OTLP HTTP; defaults target Langfuse Cloud and are off until `LANGFUSE_TRACING_ENABLED=true` + `LANGFUSE_BASIC_AUTH` (base64 `pk:sk`) are set — any OTel backend works via `LANGFUSE_OTLP_ENDPOINT`. Tracing is fail-safe (no-op without a Tracer bean, errors swallowed). Prometheus metrics path unchanged; OTLP metrics/logging export explicitly disabled. Added `RagChatTracerTest` using micrometer-tracing-test's `SimpleTracer`.
- **2026-06-10**: Added a live end-to-end RAG eval runner as the "measure first" tool for extraction-quality decisions (e.g. whether a Docling sidecar is warranted). New `LiveRagEvalTest` (skipped unless `NIB_LIVE_EVAL_BASE_URL` is set) registers a throwaway user against a running backend, uploads each unique `cases.json` fixture PDF once, waits for ingestion, asks every eval question in a fresh session, scores with `RagEvalScorer` + `RagEvalMetricsCalculator`, writes `target/rag-eval-report.md` with the aggregate `RagEvalReport` plus per-case pass/fail, and fails on scorer regressions. Run with the dev profile so cost controls don't block the 6 fixture ingestions.
- **2026-06-10**: Migrated AI model clients to Spring AI 2.0.0-M8 (model clients only — deliberately no Spring AI VectorStore/Advisor RAG chain, the first-party retrieval/citation/verification pipeline is the product). `GeminiTextClient` and `VisionService` now call Spring AI's `ChatModel` (Google GenAI starter) and `EmbeddingService` calls `EmbeddingModel` (Mistral starter); all hand-rolled RestClient HTTP/JSON plumbing and base64 image encoding were deleted while public service APIs, prompts, the primary→fallback Gemini model chain, token-usage audits, and `RateLimitException` mapping were preserved. Config moved to `spring.ai.*` (`spring.ai.model.chat=google-genai`, `spring.ai.model.embedding=mistral`, keys from `GEMINI_API_KEY`/`MISTRAL_API_KEY`); transient retry now uses `spring.ai.retry.*`. **BREAKING (build env)**: Spring AI 2.x requires Java 21, so `pom.xml` bumped `java.version` 17→21 — build with `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home` (or any JDK 21+). Tests for the three services now mock `ChatModel`/`EmbeddingModel` instead of HTTP.
- **2026-06-10**: Added Ragas-style eval metrics on top of the RAG eval harness. New `RagEvalMetrics`, `RagEvalMetricsCalculator`, and `RagEvalReport` (in `src/test/java/com/nib/backend/eval`) compute deterministic per-case faithfulness, answer correctness, context precision/recall, hallucination flags, and grounding verification from `ChatQueryResponse` + `cases.json` expectations, then aggregate into a markdown report whose groundedness rate (target >= 95%) and hallucination rate (target <= 5%) map directly to the README success metrics. No LLM judge — values are stable for CI gates. Added calculator/report unit coverage.
- **2026-06-10**: Added optional cross-encoder reranking for retrieval. New `RerankerService` calls a Cohere-v2-compatible rerank API (Jina/self-hosted bge-reranker work via `RERANKER_API_URL`/`RERANKER_MODEL`) and is disabled when `RERANKER_API_KEY` is unset. When enabled, `ChatService` widens hybrid search to a `reranker.candidates` pool (default 40), keeps the cross-encoder top-K instead of the heuristic visual-boost/diversity rerank, and blends the reranker's calibrated relevance into `computeAnswerConfidence()` (retrieval weight split 0.10 bi-encoder / 0.15 cross-encoder). The reranker fails open: any provider error falls back to the heuristic rerank truncated to dynamicTopK. Added mocked `RerankerServiceTest` and ChatService coverage for reranked ordering, widened candidate pools, and fallback truncation.
- **2026-06-10**: Added the first reusable RAG eval harness. New `backend/src/test/java/com/nib/backend/eval/RagEvalCase`, `RagEvalScorer`, and scorer tests load `src/test/resources/eval/cases.json`, validate expected answer text, forbidden text, refusal behavior, confidence bounds, citation count, citation page/source IDs, and grounding verification. Synthetic fixtures now include visual chart PDFs plus resume/table PDFs for exact-evidence, low-signal, prompt-injection, and exact-number regression cases.
- **2026-06-10**: Added a low-signal chat prompt guard. `ChatService` now saves short/gibberish user turns like repeated keyboard input, returns a clarification response before query rewriting, embeddings, retrieval, cache lookup, or Gemini generation, and keeps legitimate short document terms such as `uni`, `gpa`, `cms`, and `api` answerable. Added `ChatServiceTest` coverage for the clarification path.
- **2026-06-10**: Added persistent chat message actions. New `chat_message_feedback` records store per-user assistant message reports, `ChatController` exposes `DELETE /api/v1/chat/messages/{messageId}` and `POST /api/v1/chat/messages/{messageId}/feedback`, and `ChatService` verifies session ownership before deleting messages or saving feedback.
- **2026-06-10**: Made chat confidence a conservative answer-confidence score instead of raw retrieval similarity. `ChatService` now combines retrieval strength, deterministic grounding, citation coverage, verifier result, and citation support, caps weak/unverified answers, stores the composite in answer audits, and returns saved audit confidence/groundedness on chat history messages.
- **2026-06-10**: Added chat session deletion. `ChatController` exposes `DELETE /api/v1/chat/sessions/{sessionId}`, `ChatService` verifies the session belongs to the authenticated user before deleting messages and session metadata, and `ChatSessionNotFoundException` maps missing/unauthorized session access to 404.
- **2026-06-10**: Made evaluative chat verification deterministic after citation repair. `ChatService` now uses prompt version `rag-v9-deterministic-evaluative-verifier`, and `CitationVerifier` bypasses the Gemini verifier model for validly cited critique/strength/risk/recommendation answers so evidence-based resume feedback is not rejected merely because the source does not literally label its own weaknesses. The verifier also normalizes combined citation syntax like `[B1, B2]` into `[B1][B2]` before preflight checks. Added regression coverage for cited weak-point answers, repaired citation-less critique bullets, and combined block citations.
- **2026-06-10**: Prevented resume critique answers from collapsing into verifier refusals when Gemini omits citation tags. `ChatService` now uses prompt version `rag-v8-natural-coach-cited-evaluation`, explicitly forbids bold/title bullets and requires each critique bullet to end with `[B#]`. `CitationVerifier` now repairs missing citation tags on evaluative answers before verification, then still asks the verifier model to validate support. Added regression coverage for citation-less weak-point answers being repaired instead of refused.
- **2026-06-10**: Disabled cost-control rate limiting for local development via the `dev` Spring profile. New `application-dev.properties` sets `cost-controls.enabled=false`, and the local backend `.env` activates `SPRING_PROFILES_ACTIVE=dev`, while the default `application.properties` keeps API/chat/ingestion limits enabled for non-dev deployments.
- **2026-06-10**: Made grounded chat answers sound more like a natural reading coach. `ChatService` now uses prompt version `rag-v7-natural-coach-evaluation`, frames Nib as a thoughtful PDF companion/personal teacher, discourages stiff audit phrasing and repeated "The resume does not..." bullets, requires hyphen bullets instead of asterisk bullets, and asks resume critiques to explain why each point matters to a recruiter or reviewer.
- **2026-06-10**: Made resume critique questions answerable without weakening factual grounding. `ChatService` now uses prompt version `rag-v6-evidence-based-evaluation`, explicitly allows conservative evidence-based judgments for strengths/weaknesses/risks/gaps/recommendations, and adds resume-specific critique guidance. `CitationVerifier` now treats evaluative questions as supported when citations back the factual basis of the judgment, rather than requiring the source to literally say "weakness." Added regression coverage for resume weak-point prompts and evaluative verifier instructions.
- **2026-06-10**: Made document metadata endpoints resilient to stale storage rows. `DocumentService` now returns document metadata with `storageUrl=null` when Supabase reports the backing object is missing, while still surfacing non-missing storage failures and leaving real PDF content access strict. Added `DocumentServiceTest` coverage for missing-object signed URL failures.
- **2026-06-10**: Injected the current server-local date into grounded chat answer prompts. `ChatService` now adds a `# Current Date` section before grounding rules so relative-date questions have an explicit anchor, while instructing Gemini not to infer unsupported document facts from the date alone. Added prompt-capture coverage in `ChatServiceTest`.
- **2026-06-10**: Made visual crop uploads tolerate Supabase bucket MIME restrictions. `SupabaseStorageService` now fails fast on non-retryable 4xx upload rejections such as `invalid_mime_type`, and `IngestionRunner` disables further PNG crop uploads for the current document after storage rejects `image/png` while still indexing structured visual evidence. Resume/CV summaries now classify to `resume`, with focused regression tests for both changes.
- **2026-06-10**: Reduced another citation-verifier false positive for structural answer lead-ins. `CitationVerifier` now ignores colon-ended preambles such as `Page 1 contains the following sections:` before checking factual claims, while still enforcing citations on the actual cited list items. Added regression coverage for page-summary answers with uncited structural lead-ins followed by cited bullets.
- **2026-06-10**: Made first-turn chat answers more reliable when search indexes drift. `VectorSearchService` now exposes a stored-block fallback used only when hybrid vector/full-text retrieval returns zero rows, and `ChatService` feeds those blocks into the normal grounded prompt instead of sending Gemini an empty context. Overview prompts now still require citations on factual claims so the citation verifier and generation instructions agree.
- **2026-06-10**: Reduced false citation verifier warnings on resume-style bullets. `CitationVerifier` now lets sentence fragments inherit line-level `[B#]` or `[Page N]` citations, so abbreviations and date ranges like `Aug.` / `Dec.` do not split a cited bullet into uncited fragments. Added regression coverage for end-of-line citations on resume experience bullets.
- **2026-06-10**: Switched Gemini chat defaults to `gemini-2.5-flash-lite` and added transient provider fallback handling. `GeminiTextClient` now retries each configured model with backoff on 5xx responses, then tries comma-separated `gemini.fallback-models` such as `gemini-2.5-flash`; generation results record the actual model used so chat messages, responses, audits, and answer-cache writes preserve model provenance.
- **2026-06-10**: Made chat resilient to temporary Gemini high-demand failures. `ChatService` now catches answer-generation runtime failures after retrieval, persists a visible assistant fallback message, writes an answer audit with `refused=true`, and returns a normal `ChatQueryResponse` instead of allowing a 500 to escape. Added unit coverage for the provider-unavailable path.
- **2026-06-10**: Added first-class multi-chat sessions and document-aware conversation starters. `ChatController` now exposes session list/create endpoints plus `GET /api/v1/chat/sessions/document/{documentId}/starters`; `ChatService` creates fresh sessions on demand, titles sessions from the first user question, keeps follow-up rewriting scoped to the active session, and derives new-chat starter prompts from document type, summary, page count, and available table/chart/figure blocks.
- **2026-06-10**: Fixed structured visual JSONB persistence. `ContentBlock` now marks `table_structure`, `axis_labels`, `units`, `data_points`, and `extraction_metadata` with Hibernate JSON typing so Postgres receives jsonb parameters, including nulls, instead of varchar-bound values during ingestion.
- **2026-06-10**: Added per-user cost telemetry and dashboard data. `DatabaseMigrationRunner` now creates `cost_usage_events`; `CostTelemetryService` records pages ingested, vision calls, embedding batches, chat calls, and rate-limit hits with configurable unit-cost estimates, then combines those events with answer-audit token totals for `GET /api/v1/users/me/cost-dashboard`. Chat, ingestion, and API/ingestion rate-limit paths now emit cost events without blocking the primary workflow.
- **2026-06-10**: Added a conservative semantic cache for chat. `DatabaseMigrationRunner` now creates `embedding_cache` for exact normalized query embedding reuse and `answer_cache` for high-confidence grounded answers keyed by document ID, latest completed ingestion job ID, prompt version, and model version. New `SemanticCacheService` handles hash-based embedding lookup, pgvector answer similarity lookup, cache writes, and document answer-cache eviction. `ChatService` reuses cached query embeddings before calling Mistral, serves verified same-version answer cache hits before Gemini, writes cache entries only for grounded non-refused high-confidence answers, and `IngestionRunner` evicts answer cache entries after successful re-ingestion.
- **2026-06-10**: Added answer audit records for chat QA. New `AnswerAudit` and `AnswerAuditRepository` persist one row per assistant answer with prompt version, Gemini model, retrieved block IDs, confidence, groundedness, latency, Gemini token usage when available, refusal state, and linked user/assistant message IDs. `GeminiTextClient` now exposes `generateWithMetadata()` while preserving the existing text-only API, and `ChatService` writes audits for both generated answers and low-confidence refusals.
- **2026-06-10**: Added structured table/chart/figure extraction storage for multimodal PDF QA. `ContentBlock` now stores visual summaries, table structure JSON, chart summaries, axis labels, units, extracted data points, figure crop paths/captions, and extraction metadata separately from plain text. `VisionService` can request strict JSON visual extraction from Gemini, `IngestionRunner` creates element-level `table`, `chart`, and `figure` blocks with uploaded crop assets, and chat/search treat those block types as visual evidence alongside legacy `visual_summary` blocks.
- **2026-06-10**: Resolved the ingestion rate-limit / ingestion-improvement merge path. `IngestionService` now combines Redis-backed cost controls with stale `PROCESSING` job recovery, structured warning issue parsing, retryability flags, and launch-failure marking. `IngestionStatusResponse` includes `hasPartialFailures`, `retryable`, and structured `IngestionIssueDto` entries while preserving page-failure and warning fields. Added unit coverage for issue parsing, active job reuse, stale job retry, and budget rejection behavior.
- **2026-06-10**: Resolved the citation verifier / grounding telemetry merge path. `ChatQueryResponse` again includes `GroundingVerificationDto` for deterministic citation coverage/source mapping telemetry, while `ChatService` still runs the stricter `CitationVerifier` first. The final flow is answer generation, semantic citation verification/rewrite/refusal, citation extraction from the final answer, deterministic grounding telemetry, then persistence/response. Added unit coverage for mapped block citations and unmapped/uncited claim detection.
- **2026-06-10**: Added a post-answer citation verifier for chat. `GeminiTextClient` centralizes text-only Gemini calls, and new `CitationVerifier` runs after answer generation to extract factual claims, enforce `[B#]` citations, ask Gemini to verify cited block support, and either pass, rewrite, or fail closed with a refusal. `ChatService` now persists the verifier-adjusted answer and clears citations when the verifier refuses. Added unit coverage for citation rewrites, unsupported citation refusal, refusal-pass-through, and fail-closed verifier errors.
- **2026-06-10**: Cleaned backend startup after Redis/rate-limit additions. Disabled Spring Data Redis repository scanning because the backend only uses `StringRedisTemplate`, quieted Hibernate connection pooling logs to avoid printing JDBC URLs with embedded credentials, and changed the `pages_failed` migration flow so Hibernate no longer attempts to add a `NOT NULL` column before existing `ingestion_jobs` rows are backfilled. `DatabaseMigrationRunner` now adds `pages_failed` nullable first, backfills nulls to `0`, then sets default and `NOT NULL`.
- **2026-06-10**: Added synthetic visual PDF eval fixtures under `src/test/resources/eval`. `SyntheticVisualEvalPdfGenerator` creates raster-image PDFs for bar chart, line chart, stacked bar chart, and visual prompt-injection cases, plus `cases.json` with expected answer checks. `SyntheticVisualEvalFixturesTest` verifies the generated PDFs are readable one-page files and that chart answers are not leaked as plain PDF text.
- **2026-06-10**: Added prompt-injection defense for retrieved PDF content. New `PromptInjectionGuard` detects common malicious instructions in source text (instruction override, role hijack, prompt exfiltration, tool abuse, citation bypass, safety bypass). `ChatService` now tells Gemini that document sources are untrusted data, wraps every retrieved chunk in `BEGIN_UNTRUSTED_SOURCE` / `END_UNTRUSTED_SOURCE` boundaries, labels suspicious sources with detector reasons, and logs flagged blocks without removing them from evidence. Added unit coverage for detector behavior and prompt assembly.
- **2026-06-10**: Moved rate-limit counters from in-process memory to Redis. Added `spring-boot-starter-data-redis`, configured `spring.data.redis.url` from `REDIS_URL` with a local Redis default, and updated `SlidingWindowRateLimiter` to use an atomic Redis Lua `INCR` + `EXPIRE` script with TTL-based `Retry-After` support. Redis failures fail closed for cost-control paths, preserving budgets across backend restarts for the single-replica deployment target.
- **2026-06-10**: Added configurable backend cost controls. New `CostControlProperties` centralizes API, chat, and ingestion budgets; `ApiRateLimitFilter` applies a general `/api/**` sliding-window limit after JWT auth; `ChatRateLimiter` now delegates to shared `SlidingWindowRateLimiter`; and `IngestionService` enforces per-user trigger windows, concurrent ingestion caps, and max pages per document before queuing expensive OCR/Vision/embedding work. Defaults live under `cost-controls.*` in `application.properties`, with focused unit coverage for limiter behavior and ingestion budget rejection.
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
- **2026-06-11**: Reduced document ingestion chunking size (`ingestion.chunk.max-chars` to 800 and overlap to 100) in `application.properties` to ensure citation bounding boxes and text excerpts are more compact and contextually precise.
- **2026-06-11**: Updated `ChunkingService.java` to perform dynamic semantic chunking (splitting on paragraphs `\n\n` and sentences) instead of rigid character limits.
- **2026-06-11**: Fixed an issue in `ChatService.java` where `buildCitation` was incorrectly using the first chunk on the page for the `textExcerpt` instead of the exact chunk being cited, causing duplicate text citations in the frontend.
- **2026-06-11**: Removed `visualSummary`, `visualBlockId`, and `textBlockId` from `CitationDto` and `ChatController` payloads since the frontend no longer uses the Evidence Drawer. Also reduced `textExcerpt` from 280 characters down to 150 characters to reduce unnecessary network payload size for chat citations.
- **2026-06-11**: Implemented multi-select and bulk document actions. Frontend: `HomePage` now provides an `isSelectionMode` toggle with a floating bulk action bar rendering Restore/Move to Trash/Delete Forever. Backend: Added `/bulk/trash`, `/bulk/restore`, and `/bulk/permanent` POST endpoints to `DocumentController` matching `DocumentService` logic.
