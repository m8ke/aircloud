package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RTCAnswerResponse {

    private final ResponseType type = ResponseType.ANSWER;

    private String peerId;

    private String offer;

    private String name;

    private String device;

    public RTCAnswerResponse(
            String peerId,
            String offer,
            String name,
            String device
    ) {
        this.peerId = peerId;
        this.offer = offer;
        this.name = name;
        this.device = device;
    }

}
