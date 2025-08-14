package com.aircloud.server.socket;

import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
@Log4j2
public class WebSocketHeartbeat {

    public final Set<Peer> peers = ConcurrentHashMap.newKeySet();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public void connectPeer(WebSocketSession session) {
        final Peer peer = new Peer(session);
        peers.add(peer);
    }

    public void unconnectPeer(WebSocketSession session) {
        final Peer peer = findPeerBySession(session);
        peers.remove(peer);
        log.info("Unconnected peer session {}", session.getId());
    }

    @PostConstruct
    public void startHeartbeat() {
        scheduler.scheduleAtFixedRate(() -> {
            for (Peer peer : peers) {
                if (peer.getSession().isOpen()) {
                    try {
                        peer.getSession().sendMessage(new PingMessage());
                    } catch (IOException e) {
                        unconnectPeer(peer.getSession());
                    }
                }
            }
        }, 0, 5, TimeUnit.SECONDS);
    }

    public Peer findPeerBySession(WebSocketSession session) {
        return peers.stream()
                .filter(peer -> peer.getSession().equals(session)).findFirst()
                .orElse(null);
    }

    public Peer findPeerById(String peerId) {
        return peers.stream()
                .filter(p -> p.getSessionId().equals(peerId)).findFirst()
                .orElse(null);
    }

}
