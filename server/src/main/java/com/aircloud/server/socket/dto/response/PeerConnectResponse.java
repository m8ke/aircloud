package com.aircloud.server.socket.dto.response;

import com.aircloud.server.socket.IceServer;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class PeerConnectResponse {

    private ResponseType type = ResponseType.CONNECT;

    private String authToken;

    private String connectionId;

    private List<IceServer> iceServers;

    public PeerConnectResponse(String authToken, String connectionId, List<IceServer> iceServers) {
        this.authToken = authToken;
        this.connectionId = connectionId;
        this.iceServers = iceServers;
    }

}
