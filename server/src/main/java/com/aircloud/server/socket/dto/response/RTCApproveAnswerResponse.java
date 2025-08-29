package com.aircloud.server.socket.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCApproveAnswerResponse {

    private final ResponseType type = ResponseType.APPROVE_ANSWER;

    private UUID peerId;

    private JsonNode answer;

    public RTCApproveAnswerResponse(UUID peerId, JsonNode answer) {
        this.peerId = peerId;
        this.answer = answer;
    }

}
