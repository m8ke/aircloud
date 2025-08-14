package com.aircloud.server.socket.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BaseRequest {

    private RequestType type;

    private JsonNode data;

}
