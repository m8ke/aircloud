package com.aircloud.server.socket;

import com.aircloud.server.socket.dto.response.ResponseType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PeerConnectResponse {

    private ResponseType type = ResponseType.PEER_CONNECT;

    private String connectionId;

    private boolean isSucceed;

    public PeerConnectResponse(String connectionId, boolean isSucceed) {
        this.connectionId = connectionId;
        this.isSucceed =  isSucceed;
    }

}
