package com.aircloud.server.socket.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCAnswerRequest {

    private final RequestType type = RequestType.ANSWER;

    private JsonNode answer;

    private UUID peerId;

}
