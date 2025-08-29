package com.aircloud.server.socket.dto.request;

/**
 * Inbound (from client-side to server-side)
 */
public enum RequestType {

    CONNECT,
    DISCONNECT,
    CHANGE_SETTINGS,
    PEER_CONNECT,
    PEER_RECONNECT,
    OFFER,
    ANSWER,
    ICE_CANDIDATE,
    END_OF_ICE_CANDIDATES,

}
