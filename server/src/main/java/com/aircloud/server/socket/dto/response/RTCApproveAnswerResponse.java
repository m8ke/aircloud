package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCApproveAnswerResponse {

    private final ResponseType type = ResponseType.APPROVE_PEER_ANSWER;

    private String peerId;

    private String answer;

    private UUID connectionId;

    public RTCApproveAnswerResponse(UUID connectionId, String peerId, String answer) {
        this.connectionId = connectionId;
        this.peerId = peerId;
        this.answer = answer;
    }

}
