package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PeerConnectResponse {

    private ResponseType type = ResponseType.CONNECT;

    private UUID peerId;

    private String connectionId;

    public PeerConnectResponse(UUID peerId, String connectionId) {
        this.peerId = peerId;
        this.connectionId = connectionId;
    }

}
