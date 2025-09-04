package com.aircloud.server.socket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class TurnServerCredential {

    private static String TURN_SECRET;

    @Value("${aircloud.turn.secret}")
    public void setTurnSecret(String turnSecret) {
        TURN_SECRET = turnSecret;
    }

    public static String getTurnSecret() {
        return TURN_SECRET;
    }

    public static EphemeralCred generate(final String userId, final int ttlSeconds) throws Exception {
        final long expiry = (System.currentTimeMillis() / 1000) + ttlSeconds;
        final String username = expiry + ":" + userId;

        final Mac hmac = Mac.getInstance("HmacSHA1");
        hmac.init(new SecretKeySpec(getTurnSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA1"));

        final byte[] hash = hmac.doFinal(username.getBytes(StandardCharsets.UTF_8));
        final String credential = Base64.getEncoder().encodeToString(hash);

        return new EphemeralCred(username, credential);
    }

    public record EphemeralCred(String username, String credential) {
    }

}
