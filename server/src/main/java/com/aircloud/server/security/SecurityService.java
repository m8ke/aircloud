package com.aircloud.server.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.security.*;
import java.util.Date;
import java.util.UUID;

public class SecurityService {

    private static final SecretKey SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);

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
                .signWith(SECRET_KEY)
                .claim("connectionId", connectionId)
                .compact();
    }

    public static boolean verifyAuthToken(
            final String token
    ) {
        try {
            Jwts.parser()
                    .setSigningKey(SECRET_KEY)
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
                .setSigningKey(SECRET_KEY)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return Auth.builder()
                .peerId(UUID.fromString(claims.getSubject()))
                .connectionId(claims.get("connectionId", String.class))
                .build();
    }

}
