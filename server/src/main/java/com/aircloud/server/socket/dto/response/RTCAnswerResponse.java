package com.aircloud.server.socket.dto.response;

import com.aircloud.server.socket.DiscoveryMode;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCAnswerResponse {

    private final ResponseType type = ResponseType.ANSWER;

    private UUID peerId;

    private JsonNode offer;

    private String name;

    private String device;

    private DiscoveryMode discoveryMode;

    public RTCAnswerResponse(
            UUID peerId,
            JsonNode offer,
            String name,
            String device,
            DiscoveryMode discoveryMode
    ) {
        this.peerId = peerId;
        this.offer = offer;
        this.name = name;
        this.device = device;
        this.discoveryMode = discoveryMode;
    }

}
