package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCAnswerResponse {

    private final ResponseType type = ResponseType.PEER_ANSWER;

    private UUID connectionId;

    private String peerId;

    private String offer;

    public RTCAnswerResponse(UUID connectionId, String peerId, String offer) {
        this.connectionId = connectionId;
        this.peerId = peerId;
        this.offer = offer;
    }

}
