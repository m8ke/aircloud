package com.aircloud.server.socket.dto.request;

import com.aircloud.server.socket.DiscoveryMode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PeerConnectRequest {

    private String name;

    private String authToken;

    private DiscoveryMode discoveryMode;

}
