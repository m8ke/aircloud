package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RTCApproveAnswerResponse {

    private final ResponseType type = ResponseType.APPROVE_ANSWER;

    private String peerId;

    private String answer;

    public RTCApproveAnswerResponse(String peerId, String answer) {
        this.peerId = peerId;
        this.answer = answer;
    }

}
