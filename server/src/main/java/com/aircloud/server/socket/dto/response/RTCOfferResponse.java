package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCOfferResponse {

    private final ResponseType type = ResponseType.OFFER;

    private UUID peerId;

    private String name;

    private String device;

    public RTCOfferResponse(
            UUID peerId,
            String name,
            String device
    ) {
        this.peerId = peerId;
        this.name = name;
        this.device = device;
    }

}
