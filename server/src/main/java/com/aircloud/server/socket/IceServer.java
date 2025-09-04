package com.aircloud.server.socket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class IceServer {

    private String urls;

    private String username;

    private String credential;

}
