package com.aircloud.server.socket;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class Room {

    private String id;

    private RoomType type;

    private List<Peer> peers = new ArrayList<>();

    private String ipAddress;

    public Room(String id, RoomType type, String ipAddress) {
        this.id = id;
        this.type = type;
        this.ipAddress = ipAddress;
    }

    public void addPeer(Peer peer) {
        peers.add(peer);
    }

    public void removePeer(Peer peer) {
        peers.remove(peer);
    }

}
