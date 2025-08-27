package com.aircloud.server.socket.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PeerManualConnectResponse {

    private ResponseType type = ResponseType.PEER_CONNECT;

    private UUID peerId;

    @JsonProperty("isConnected")
    private boolean isConnected;

    public PeerManualConnectResponse(UUID peerId, boolean isConnected) {
        this.peerId = peerId;
        this.isConnected = isConnected;
    }

}
