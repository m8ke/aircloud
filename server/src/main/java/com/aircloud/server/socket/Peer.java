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
    private DiscoveryMode discoveryMode = DiscoveryMode.NETWORK;

    @JsonIgnore
    private Instant lastSeen;

    private UUID peerId;

    private UUID privateKey;

    private String connectionId;

    private String device;

    private String name;

    public Peer(WebSocketSession session) {
        this.session = session;
        this.ipAddress = parseIpAddress();
        this.device = parseDeviceName();
        this.lastSeen = Instant.now();
        this.privateKey = UUID.randomUUID();
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

    public void renewPrivateKey() {
        this.privateKey = UUID.randomUUID();
    }

    @JsonIgnore
    public boolean isActive() {
        return session.isOpen() && name != null && device != null;
    }

}
