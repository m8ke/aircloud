package com.aircloud.server.socket;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.socket.WebSocketSession;
import ua_parser.Client;
import ua_parser.Parser;

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
    private int heartBeat;

    private UUID publicId; // Public ID to handle connections on the client-side (only informative meaning)

    private UUID privateId; // Private ID to manipulate session and reconnect

    private String connectionId; // Short unique (usually 6-8 chars) for easier connection

    private String device;

    private String name;

    public Peer(WebSocketSession session) {
        this.session = session;
        this.ipAddress = parseIpAddress();
        this.device = parseDeviceName();
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
        this.ipAddress = parseIpAddress();
    }

    @JsonIgnore
    public boolean isActive() {
        return session.isOpen() && name != null && device != null;
    }

}
