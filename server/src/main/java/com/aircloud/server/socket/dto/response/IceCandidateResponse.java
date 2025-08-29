package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class IceCandidateResponse {

    private ResponseType type = ResponseType.ICE_CANDIDATE;

    private UUID peerId;

    private String ice;

    public IceCandidateResponse(UUID peerId, String ice) {
        this.peerId = peerId;
        this.ice = ice;
    }

}
