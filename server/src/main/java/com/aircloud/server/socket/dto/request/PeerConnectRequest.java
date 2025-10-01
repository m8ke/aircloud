package com.aircloud.server.socket.dto.request;

import com.aircloud.server.socket.Discoverability;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PeerConnectRequest {

    private String name;

    private UUID publicId;

    private String authToken;

    private Discoverability discoverability;

}
