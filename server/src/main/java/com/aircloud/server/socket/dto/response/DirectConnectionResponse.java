package com.aircloud.server.socket.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DirectConnectionResponse {

    private ResponseType type = ResponseType.DIRECT_CONNECTION;

    private boolean isConnected;

}
