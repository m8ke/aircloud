package com.aircloud.server.socket.dto.request;

import com.aircloud.server.socket.Discoverability;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PeerChangeDataRequest {

    private String name;

    private Discoverability discoverability;

}
