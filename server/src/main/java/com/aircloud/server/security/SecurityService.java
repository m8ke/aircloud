package com.aircloud.server.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Date;
import java.util.UUID;

@Component
public class SecurityService {

    private static String SECRET_KEY;

    @Value("${aircloud.jwt.secret}")
    public void setSecret(String jwtSecret) {
        SECRET_KEY = jwtSecret;
    }

    private static Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));
    }

    public static String issueAuthToken(
            final UUID peerId,
            final String connectionId
    ) {
        long now = System.currentTimeMillis();
        long exp = now + 2 * 60 * 1000; // 2 minutes TTL

        return Jwts.builder()
                .subject(peerId.toString())
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date(now))
                .expiration(new Date(exp))
                .signWith(getSigningKey())
                .claim("connectionId", connectionId)
                .compact();
    }

    public static boolean verifyAuthToken(
            final String token
    ) {
        try {
            Jwts.parser()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static Auth parseAuth(
            final String token
    ) {
        final Claims claims = Jwts.parser()
                .setSigningKey(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return Auth.builder()
                .peerId(UUID.fromString(claims.getSubject()))
                .connectionId(claims.get("connectionId", String.class))
                .build();
    }

}
