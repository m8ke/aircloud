package com.aircloud.server.socket.dto.request;

/**
 * Inbound (from client-side to server-side)
 */
public enum RequestType {

    CONNECT,
    DISCONNECT,
    CHANGE_SETTINGS,
    PEER_OFFER,
    PEER_ANSWER

}
