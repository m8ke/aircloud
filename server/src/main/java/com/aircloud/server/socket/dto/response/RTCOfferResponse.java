package com.aircloud.server.socket.dto.response;

import com.aircloud.server.socket.ConnectionType;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCOfferResponse {

    private final ResponseType type = ResponseType.OFFER;

    private UUID peerId;

    private String name;

    private String device;

    private ConnectionType connectionType;

    public RTCOfferResponse(
            UUID peerId,
            String name,
            String device,
            ConnectionType connectionType
    ) {
        this.peerId = peerId;
        this.name = name;
        this.device = device;
        this.connectionType = connectionType;
    }

}
