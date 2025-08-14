package com.aircloud.server.socket.dto.response;

import com.aircloud.server.socket.Peer;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PeerLeftResponse {

    private ResponseType type = ResponseType.PEER_LEFT;

    private Peer peer;

    public PeerLeftResponse(Peer peer) {
        this.peer = peer;
    }

}
