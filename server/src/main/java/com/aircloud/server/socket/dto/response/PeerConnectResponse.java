package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PeerConnectResponse {

    private final ResponseType type = ResponseType.CONNECT;

    private String peerId;

    public PeerConnectResponse(String peerId) {
        this.peerId = peerId;
    }

}
