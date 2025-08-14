package com.aircloud.server.socket.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCAnswerRequest {

    private final RequestType type = RequestType.PEER_ANSWER;

    private String answer;

    private String peerId;

    private UUID connectionId;

}
