package com.aircloud.server.socket.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RTCOfferRequest {

    private final RequestType type = RequestType.OFFER;

    private String offer;

    private String peerId;

}
