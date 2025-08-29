package com.aircloud.server.socket.dto.response;

/**
 * Outbound (from server-side to client-side)
 */
public enum ResponseType {

    CONNECT,
    DISCONNECT,
    OFFER,
    ANSWER,
    APPROVE_ANSWER,
    PEER_CONNECT,
    ICE_CANDIDATE,
    END_OF_ICE_CANDIDATES

}
