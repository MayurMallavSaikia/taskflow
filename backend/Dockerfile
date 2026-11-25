# The official Gradle image already contains the Gradle version used by the wrapper,
# so the build doesn't need to download a Gradle distribution.
FROM gradle:9.1.0-jdk17 AS build
WORKDIR /app
# Copy the build files first so dependency downloads are cached between source changes.
COPY settings.gradle.kts build.gradle.kts ./
RUN gradle dependencies --no-daemon -q > /dev/null
COPY src src
RUN gradle bootJar --no-daemon -q

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 taskflow
COPY --from=build /app/build/libs/*.jar app.jar
USER taskflow
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
