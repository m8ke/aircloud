package com.aircloud.server.socket;

import com.aircloud.server.socket.dto.response.ResponseType;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PeerConnectResponse {

    private ResponseType type = ResponseType.PEER_CONNECT;

    private UUID peerId;

    @JsonProperty("isConnected")
    private boolean isConnected;

    public PeerConnectResponse(UUID peerId, boolean isConnected) {
        this.peerId = peerId;
        this.isConnected = isConnected;
    }

}
