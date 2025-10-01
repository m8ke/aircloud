package com.aircloud.server.socket.dto.response;

import com.aircloud.server.socket.IceServer;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class PingPongResponse {

    private ResponseType type = ResponseType.PING_PONG;

    private String authToken;

    private List<IceServer> iceServers;

    public PingPongResponse(String authToken, List<IceServer> iceServers) {
        this.authToken = authToken;
        this.iceServers = iceServers;
    }

}
