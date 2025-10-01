package com.aircloud.server.security;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.Ed25519Signer;
import com.nimbusds.jose.crypto.Ed25519Verifier;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.OctetKeyPair;
import com.nimbusds.jose.jwk.gen.OctetKeyPairGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

public class SecurityService {

    // Generate a new Ed25519 keypair
    public static OctetKeyPair generateOKP() throws Exception {
        return new OctetKeyPairGenerator(Curve.Ed25519).generate();
    }

    // Issue a short-lived reconnect token
    public static String issueAuthToken(OctetKeyPair privKey, UUID peerId) throws Exception {
        JWSSigner signer = new Ed25519Signer(privKey);

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(peerId.toString()) // peer ID is UUID
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 5 * 60 * 1000)) // 5 min
                .jwtID(UUID.randomUUID().toString()) // unique token ID
                .build();

        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.EdDSA).build();
        SignedJWT signedJWT = new SignedJWT(header, claims);
        signedJWT.sign(signer);

        return signedJWT.serialize();
    }

    // Verify reconnect token using peer’s public key
    public static boolean verifyAuthToken(String token, OctetKeyPair pubKey) throws Exception {
        SignedJWT signedJWT = SignedJWT.parse(token);

        if (!signedJWT.getHeader().getAlgorithm().equals(JWSAlgorithm.EdDSA)) return false;

        JWSVerifier verifier = new Ed25519Verifier(pubKey);
        if (!signedJWT.verify(verifier)) return false;

        Date now = new Date();
        return signedJWT.getJWTClaimsSet().getExpirationTime().after(now);
    }

    // Sign nonce (with optional binding to JWT jti)
    public static String signNonce(PrivateKey privKey, byte[] nonce, String jti) throws Exception {
        Signature sig = Signature.getInstance("Ed25519");
        sig.initSign(privKey);
        sig.update(nonce);
        if (jti != null) {
            sig.update(jti.getBytes(StandardCharsets.UTF_8));
        }
        return Base64.getEncoder().encodeToString(sig.sign());
    }

    // Verify nonce signature
    public static boolean verifyNonce(PublicKey pubKey, byte[] nonce, String jti, String signatureB64) throws Exception {
        Signature sig = Signature.getInstance("Ed25519");
        sig.initVerify(pubKey);
        sig.update(nonce);
        if (jti != null) {
            sig.update(jti.getBytes(StandardCharsets.UTF_8));
        }
        byte[] sigBytes = Base64.getDecoder().decode(signatureB64);
        return sig.verify(sigBytes);
    }

}
