package com.aircloud.server.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final Key key;

    public JwtService() {
        this.key = Keys.hmacShaKeyFor("JWT_SECRET_1231231_asdasda_asdasdasD_123123".getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UUID peerId, String connectionId) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(15 * 60); // short-lived token

        return Jwts.builder()
                .setSubject(peerId.toString())
                .claim("connectionId", connectionId)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Jws<Claims> parseToken(String token) {
        return Jwts.parser()
                .setSigningKey(key)
                .build()
                .parseSignedClaims(token);
    }

    public boolean isTokenValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}

