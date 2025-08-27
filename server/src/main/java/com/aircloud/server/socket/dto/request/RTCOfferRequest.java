package com.aircloud.server.socket.dto.request;

import com.aircloud.server.socket.ConnectionType;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class RTCOfferRequest {

    private final RequestType type = RequestType.OFFER;

    private String offer;

    private UUID peerId;

    private ConnectionType connectionType;

}
