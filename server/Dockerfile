# STAGE 1: BUILD
FROM gradle:jdk24-jammy AS build

COPY . /server

COPY --chown=gradle:gradle . /home/gradle/src

WORKDIR /home/gradle/src

RUN gradle build --no-daemon -x test

# STAGE 2: BOOT
FROM eclipse-temurin:24-jdk-jammy

ENV PORT=$PORT

COPY --from=build /home/gradle/src/build/libs/*.jar server.jar

ENTRYPOINT ["java", "-jar", "server.jar"]
