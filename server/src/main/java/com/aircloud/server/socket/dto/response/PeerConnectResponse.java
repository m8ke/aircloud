package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PeerConnectResponse {

    private final ResponseType type = ResponseType.CONNECT;

    private String peerId;

    private String connectionId;

    public PeerConnectResponse(String peerId, String connectionId) {
        this.peerId = peerId;
        this.connectionId = connectionId;
    }

}
