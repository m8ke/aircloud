package com.aircloud.server.socket.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RTCAnswerRequest {

    private final RequestType type = RequestType.ANSWER;

    private String answer;

    private String peerId;

}
