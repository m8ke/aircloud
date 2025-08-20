package com.aircloud.server.socket;

import com.aircloud.server.socket.dto.request.*;
import com.aircloud.server.socket.dto.response.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Log4j2
@Component
public class WebSocketHandler extends TextWebSocketHandler {

    private final Set<Peer> peers = ConcurrentHashMap.newKeySet();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    @Override
    public void afterConnectionEstablished(final WebSocketSession session) {
        connectPeer(session);
    }

    @Override
    public void afterConnectionClosed(
            final WebSocketSession session,
            final CloseStatus status
    ) {
        unconnectPeer(session);
    }

    @Override
    public void handlePongMessage(
            final WebSocketSession session,
            final PongMessage message
    ) {
        final Peer peer = findPeerBySession(session);
        peer.updatePeerSession(session);
        log.info("Pong received from peer ID {}", session.getId());
    }

    public void connectPeer(WebSocketSession session) {
        final Peer peer = new Peer(session);
        peers.add(peer);
        log.info("Peer ID {} established connection", session.getId());
    }

    public void unconnectPeer(WebSocketSession session) {
        final Peer peer = findPeerBySession(session);
        peers.remove(peer);
        unconnectPeerInNetwork(peer);
        log.info("Peer ID {} disconnected", session.getId());
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

    /**
     * Handle requests sent through messages.
     *
     * @param session unique WebSocket session
     * @param message text message sent by session
     */
    @Override
    public void handleTextMessage(
            final WebSocketSession session,
            final TextMessage message
    ) throws JsonProcessingException {
        final BaseRequest payload = new ObjectMapper().readValue(message.getPayload(), BaseRequest.class);
        final Peer peer = findPeerBySession(session);

        if (peer != null) {
            peer.updatePeerSession(session);

            switch (payload.getType()) {
                case RequestType.CONNECT -> {
                    final PeerConnectRequest data = new ObjectMapper().convertValue(payload.getData(), PeerConnectRequest.class);
                    peer.setName(data.getName());
                    peer.setDiscoverability(data.getDiscoverability());
                    sendMessage(session, new PeerConnectResponse(peer.getSessionId()));
                    log.info("Peer ID {} connected", peer.getSessionId());
                    handlePeerConnection(peer);
                }
                case RequestType.CHANGE_SETTINGS -> {
                    final PeerChangeSettingsRequest data = new ObjectMapper().convertValue(payload.getData(), PeerChangeSettingsRequest.class);
                    peer.setName(data.getName());
                    peer.setDiscoverability(data.getDiscoverability());
                }
                case RequestType.OFFER -> {
                    final RTCOfferRequest data = new ObjectMapper().convertValue(payload.getData(), RTCOfferRequest.class);
                    final Peer recipientPeer = findPeerById(data.getPeerId());

                    if (recipientPeer != null) {
                        sendMessage(recipientPeer.getSession(), new RTCAnswerResponse(peer.getSessionId(), data.getOffer(), peer.getName(), peer.getDevice()));
                    }
                }
                case RequestType.ANSWER -> {
                    final RTCAnswerRequest data = new ObjectMapper().convertValue(payload.getData(), RTCAnswerRequest.class);
                    final Peer recipientPeer = findPeerById(data.getPeerId());

                    if (recipientPeer != null) {
                        sendMessage(recipientPeer.getSession(), new RTCApproveAnswerResponse(peer.getSessionId(), data.getAnswer()));
                    }
                }
            }
        }
    }

    private void sendMessage(
            final WebSocketSession session,
            final Object message
    ) {
        try {
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(new ObjectMapper().writeValueAsString(message)));
                }
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private void handlePeerConnection(final Peer peer) {
        if (peer.getDiscoverability().equals(Discoverability.NETWORK)) {
            for (Peer p : findPeersInNetwork(peer)) {
                establishConnectionBetweenPeers(p, peer);
            }
        }
    }

    private List<Peer> findPeersInNetwork(final Peer peer) {
        return peers.stream()
                .filter(p -> p.getDiscoverability().equals(Discoverability.NETWORK))
                .filter(p -> p.getIpAddress().equals(peer.getIpAddress()))
                .filter(p -> !p.equals(peer))
                .filter(Peer::isActive)
                .toList();
    }

    private void unconnectPeerInNetwork(final Peer peer) {
        for (Peer p : findPeersInNetwork(peer)) {
            sendMessage(p.getSession(), new PeerDisconnectResponse(peer.getSessionId()));
        }
    }

    private void establishConnectionBetweenPeers(Peer peerA, Peer peerB) {
        if (!peerA.equals(peerB)) {
            log.info("Peer A {} and Peer B {} connected", peerA.getSessionId(), peerB.getSessionId());
            sendMessage(peerA.getSession(), new RTCOfferResponse(peerB.getSessionId(), peerB.getName(), peerA.getDevice()));
        }
    }

}
