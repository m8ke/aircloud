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

    private String connectionId;

    private String device;

    private String name;

    private UUID peerId;

    public Peer(WebSocketSession session) {
        this.session = session;
        this.ipAddress = parseIpAddress();
        this.device = parseDeviceName();
    }

    private String parseIpAddress() {
        return Objects.requireNonNull(session.getRemoteAddress()).getAddress().getHostAddress();
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
