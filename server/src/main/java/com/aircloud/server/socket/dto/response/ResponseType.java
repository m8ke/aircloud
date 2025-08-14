package com.aircloud.server.socket.dto.response;

/**
 * Outbound (from server-side to client-side)
 */
public enum ResponseType {

    PEER_CONNECTED,
    PEER_JOINED,
    PEER_LEFT,
    PEER_OFFER,
    PEER_ANSWER,
    APPROVE_PEER_ANSWER

}
