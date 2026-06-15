# ---- Build stage ----
# Uses the Maven wrapper so the build matches local. Dependencies are cached in a
# separate layer so source-only changes don't re-download the world.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -B dependency:go-offline

COPY src ./src
RUN ./mvnw -B clean package -DskipTests

# ---- Runtime stage ----
# Slim JRE image; runs as a non-root user.
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /app/target/*.jar app.jar
USER app

# Render/Railway inject $PORT; application.properties binds server.port to it.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
