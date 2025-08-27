package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PeerDisconnectResponse {

    private ResponseType type = ResponseType.DISCONNECT;

    private UUID peerId;

    public PeerDisconnectResponse(UUID peerId) {
        this.peerId = peerId;
    }

}
