package com.aircloud.server.socket.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class EndOfIceCandidateRequest {

    private UUID peerId;

}
