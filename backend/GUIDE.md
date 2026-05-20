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

#### Controller: [`AuthController`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/controller/AuthController.java)
| Verb | Endpoint Route |
| --- | --- |
| `POST` | `/api/v1/auth/register` |
| `POST` | `/api/v1/auth/authenticate` |

#### Controller: [`DocumentController`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/controller/DocumentController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/documents` |
| `POST` | `/api/v1/documents/upload` |
| `POST` | `/api/v1/documents/merge` |

#### Controller: [`TestController`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/controller/TestController.java)
| Verb | Endpoint Route |
| --- | --- |
| `GET` | `/api/v1/test/hello` |
| `POST` | `/api/v1/test/email` |

### Database Entities (`backend/src/.../model`)

- [`Document`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/model/Document.java)
- [`User`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/model/User.java)

### Data Access Repositories (`backend/src/.../repository`)

- [`DocumentRepository`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/repository/DocumentRepository.java)
- [`UserRepository`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/repository/UserRepository.java)

### Business Services (`backend/src/.../service`)

- [`AuthService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/AuthService.java)
- [`DocumentService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/DocumentService.java)
- [`JwtService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/JwtService.java)
- [`SupabaseStorageService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/SupabaseStorageService.java)
- [`TestIService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/TestIService.java)
- [`TestService`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/service/TestService.java)

### Data Transfer Objects (`backend/src/.../dto`)

- [`AuthRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/AuthRequest.java)
- [`AuthResponse`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/AuthResponse.java)
- [`DocumentResponse`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/DocumentResponse.java)
- [`RegisterRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/RegisterRequest.java)
- [`TestRequest`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/TestRequest.java)
- [`TestResponse`](file:///A:/Coding/ai-pdf-viewer/backend/src/main/java/com/nib/backend/dto/TestResponse.java)


<!-- END_AUTO_MAP -->

---

## 3. Agent Changelog & Decisions

This section is maintained by AI coding agents to track architectural updates, entity changes, or pattern adjustments. When adding new endpoints or entities, append an entry to the log below.

### Log
- **2026-05-20**: Created the initial `GUIDE.md` skeleton and implemented the guide update automation script.
- **2026-05-19**: Added document upload, listing, and PDF merge. New: `Document` entity, `DocumentRepository`, `DocumentResponse` DTO, `DocumentController` (`POST /upload`, `GET /`, `POST /merge`), `DocumentService`, `SupabaseStorageService` (Supabase Storage REST via `RestClient`), `GlobalExceptionHandler`, and exception types. Updated: `pom.xml` (added PDFBox 3.0.3), `application.properties` (Supabase Storage config, multipart limits 50 MB, Jackson ISO dates), `ApplicationConfig` (added `RestClient` bean). Supabase Storage bucket name configurable via `SUPABASE_STORAGE_BUCKET` env var (default: `documents`). Signed URLs valid for 1 hour.
