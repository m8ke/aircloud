package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCApproveAnswerResponse {

    private final ResponseType type = ResponseType.APPROVE_ANSWER;

    private UUID peerId;

    private String answer;

    public RTCApproveAnswerResponse(UUID peerId, String answer) {
        this.peerId = peerId;
        this.answer = answer;
    }

}
