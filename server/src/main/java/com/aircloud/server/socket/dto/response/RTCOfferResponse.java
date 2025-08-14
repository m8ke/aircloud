package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCOfferResponse {

    private final ResponseType type = ResponseType.PEER_OFFER;

    private UUID connectionId;

    private String peerId;

    public RTCOfferResponse(UUID connectionId, String peerId) {
        this.connectionId = connectionId;
        this.peerId = peerId;
    }

}
