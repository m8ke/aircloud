package com.aircloud.server.socket.dto.response;

import com.aircloud.server.socket.IceServer;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class PeerConnectResponse {

    private ResponseType type = ResponseType.CONNECT;

    private UUID publicId;

    private String privateId;

    private String connectionId;

    private List<IceServer> iceServers;

    public PeerConnectResponse(UUID publicId, String privateId, String connectionId, List<IceServer> iceServers) {
        this.publicId = publicId;
        this.privateId = privateId;
        this.connectionId = connectionId;
        this.iceServers = iceServers;
    }

}
