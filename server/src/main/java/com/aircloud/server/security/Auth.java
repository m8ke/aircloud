package com.aircloud.server.security;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
public class Auth {

    private UUID peerId;

    private String connectionId;

}
