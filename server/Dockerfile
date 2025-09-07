# STAGE 1: BUILD
FROM gradle:jdk24-corretto AS build

WORKDIR /home/gradle/src

COPY --chown=gradle:gradle . .

RUN gradle build --no-daemon -x test

# STAGE 2: BOOT
FROM eclipse-temurin:24-jdk-ubi9-minimal

ENV PORT=$PORT
ENV DOMAIN=$DOMAIN
ENV STUN_IP=$STUN_IP
ENV TURN_IP=$TURN_IP
ENV TURN_SECRET=$TURN_SECRET

COPY --from=build /home/gradle/src/build/libs/*.jar server.jar

ENTRYPOINT ["java", "-jar", "server.jar"]
