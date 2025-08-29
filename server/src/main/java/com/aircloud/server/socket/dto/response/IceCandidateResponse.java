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

    private JsonNode ice;

    public IceCandidateResponse(UUID peerId, JsonNode ice) {
        this.peerId = peerId;
        this.ice = ice;
    }

}
