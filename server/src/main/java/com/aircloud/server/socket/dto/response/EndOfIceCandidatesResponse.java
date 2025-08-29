package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class EndOfIceCandidatesResponse {

    private ResponseType type = ResponseType.END_OF_ICE_CANDIDATES;

    private UUID peerId;

    public EndOfIceCandidatesResponse(UUID peerId) {
        this.peerId = peerId;
    }

}
