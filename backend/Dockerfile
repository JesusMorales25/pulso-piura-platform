FROM maven:3.9.11-eclipse-temurin-21-alpine AS build
WORKDIR /workspace
COPY pom.xml pom.xml
RUN mvn -B -q -DskipTests dependency:go-offline
COPY src src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S pulso && adduser -S -G pulso -u 10001 pulso
WORKDIR /app
COPY --from=build /workspace/target/platform-backend-*.jar app.jar
COPY render-entrypoint.sh /app/render-entrypoint.sh
RUN chmod 0555 /app/render-entrypoint.sh
USER 10001
EXPOSE 8080
ENTRYPOINT ["/app/render-entrypoint.sh"]
