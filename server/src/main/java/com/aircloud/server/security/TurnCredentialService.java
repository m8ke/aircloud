package com.aircloud.server.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class TurnCredentialService {

    private static String TURN_SECRET;

    @Value("${aircloud.turn.secret}")
    public void setTurnSecret(String turnSecret) {
        TURN_SECRET = turnSecret;
    }

    public static EphemeralCredentials generate(
            final String userId,
            final int ttlSeconds
    ) throws Exception {
        if (TURN_SECRET == null || TURN_SECRET.isEmpty()) {
            return null;
        }

        final long expiry = (System.currentTimeMillis() / 1000) + ttlSeconds;
        final String username = expiry + ":" + userId;

        final Mac hmac = Mac.getInstance("HmacSHA1");
        hmac.init(new SecretKeySpec(TURN_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));

        final byte[] hash = hmac.doFinal(username.getBytes(StandardCharsets.UTF_8));
        final String credential = Base64.getEncoder().encodeToString(hash);

        return new EphemeralCredentials(username, credential);
    }

    public record EphemeralCredentials(String username, String credential) {
    }

}
