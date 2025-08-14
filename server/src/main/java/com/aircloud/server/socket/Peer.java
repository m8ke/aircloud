package com.aircloud.server.socket;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import net.datafaker.Faker;
import org.springframework.web.socket.WebSocketSession;

import java.util.Objects;

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

    private String device;

    private String name = randomizeName();

    public Peer(WebSocketSession session) {
        this.session = session;
        this.ipAddress = parseIpAddress();
        this.device = parseDeviceName();
    }

    private String randomizeName() {
        final Faker faker = new Faker();
        return faker.animal().name();
    }

    private String parseIpAddress() {
        return Objects.requireNonNull(session.getRemoteAddress()).getAddress().getHostAddress();
    }

    private String parseDeviceName() {
        return Objects.requireNonNull(session.getHandshakeHeaders().get("user-agent")).getFirst();
    }

    public void updatePeerSession(WebSocketSession session) {
        this.session = session;
        this.ipAddress = parseIpAddress();
    }

    public String getSessionId() {
        return session.getId();
    }

    @JsonIgnore
    public boolean isActive() {
        return discoverability != null;
    }

}
