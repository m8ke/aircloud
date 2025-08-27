package com.aircloud.server.socket.dto.response;

import com.aircloud.server.socket.ConnectionType;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCAnswerResponse {

    private final ResponseType type = ResponseType.ANSWER;

    private UUID peerId;

    private String offer;

    private String name;

    private String device;

    private ConnectionType connectionType;

    public RTCAnswerResponse(
            UUID peerId,
            String offer,
            String name,
            String device,
            ConnectionType connectionType
    ) {
        this.peerId = peerId;
        this.offer = offer;
        this.name = name;
        this.device = device;
        this.connectionType = connectionType;
    }

}
