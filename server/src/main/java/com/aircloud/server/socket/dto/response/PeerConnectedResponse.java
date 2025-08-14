package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PeerConnectedResponse {

    private final ResponseType type = ResponseType.PEER_CONNECTED;

    private String device;

    public PeerConnectedResponse(String device) {
        this.device = device;
    }

}
