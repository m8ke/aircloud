package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PeerDisconnectResponse {

    private ResponseType type = ResponseType.DISCONNECT;

    private String peerId;

    public PeerDisconnectResponse(String peerId) {
        this.peerId = peerId;
    }

}
