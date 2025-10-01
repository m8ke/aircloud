package com.aircloud.server.socket;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.socket.WebSocketSession;
import ua_parser.Client;
import ua_parser.Parser;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Getter
@Setter
public class Peer {

    @JsonIgnore
    private WebSocketSession session;

    @JsonIgnore
    private String ipAddress;

    @JsonIgnore
    private Discoverability discoverability = Discoverability.NETWORK;

    @JsonIgnore
    private Instant lastSeen;

    @JsonIgnore
    private Object privateKey;

    private UUID peerId; // Public ID to handle connections on the client-side (only informative meaning)

    private String connectionId; // Short unique (usually 6-8 chars) for easier connection

    private String device;

    private String name;

    private static final int DEFAULT_TTL_SECONDS = 30;

    public Peer(WebSocketSession session) {
        this.session = session;
        this.ipAddress = parseIpAddress();
        this.device = parseDeviceName();
        this.lastSeen = Instant.now();
    }

    private String parseIpAddress() {
        return (String) session.getAttributes().get("ipAddress");
    }

    private String parseDeviceName() {
        String uaString = Objects.requireNonNull(session.getHandshakeHeaders().get("user-agent")).getFirst();

        final Parser uaParser = new Parser();
        final Client client = uaParser.parse(uaString);

        return client.os.family;
    }

    public void updatePeerSession(WebSocketSession session) {
        this.session = session;
        this.lastSeen = Instant.now();
        this.ipAddress = parseIpAddress();
    }

    public void visit() {
        this.lastSeen = Instant.now();
    }

    @JsonIgnore
    public boolean isActive() {
        return session.isOpen() && name != null && device != null;
    }

    @JsonIgnore
    public boolean hasExpired() {
        return lastSeen.plusSeconds(DEFAULT_TTL_SECONDS).isBefore(Instant.now());
    }

    @JsonIgnore
    public long getSecondsUntilExpiry() {
        return Math.max(0, DEFAULT_TTL_SECONDS - java.time.Duration.between(lastSeen, Instant.now()).getSeconds());
    }

}
