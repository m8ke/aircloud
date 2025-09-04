package com.aircloud.server.socket.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class IceCandidateResponse {

    private ResponseType type = ResponseType.ICE_CANDIDATE;

    private UUID peerId;

    private JsonNode candidate;

    public IceCandidateResponse(UUID peerId, JsonNode candidate) {
        this.peerId = peerId;
        this.candidate = candidate;
    }

}
