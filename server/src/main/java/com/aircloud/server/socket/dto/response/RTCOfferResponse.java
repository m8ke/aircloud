package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RTCOfferResponse {

    private final ResponseType type = ResponseType.OFFER;

    private String peerId;

    private String name;

    private String device;

    public RTCOfferResponse(
            String peerId,
            String name,
            String device
    ) {
        this.peerId = peerId;
        this.name = name;
        this.device = device;
    }

}
