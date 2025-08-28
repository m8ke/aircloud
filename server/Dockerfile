# STAGE 1: BUILD
FROM gradle:jdk24-corretto AS build

WORKDIR /home/gradle/src

COPY --chown=gradle:gradle . .

RUN gradle build --no-daemon -x test

# STAGE 2: BOOT
FROM eclipse-temurin:24-jdk-ubi9-minimal

ENV PORT=$PORT

COPY --from=build /home/gradle/src/build/libs/*.jar server.jar

ENTRYPOINT ["java", "-jar", "server.jar"]
