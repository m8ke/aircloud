package com.aircloud.server.socket;

import com.aircloud.server.socket.dto.request.*;
import com.aircloud.server.socket.dto.response.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PongMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Log4j2
@Component
public class WebSocketHandler extends TextWebSocketHandler {

    private final WebSocketHeartbeat heartBeat;
    private final Set<Room> rooms = ConcurrentHashMap.newKeySet();

    public WebSocketHandler(WebSocketHeartbeat heartBeat) {
        this.heartBeat = heartBeat;
    }

    @Override
    public void afterConnectionEstablished(final WebSocketSession session) {
        heartBeat.connectPeer(session);
    }

    @Override
    public void afterConnectionClosed(
            final WebSocketSession session,
            final CloseStatus status
    ) {
        unconnectPeerFromRooms(heartBeat.findPeerBySession(session));
        heartBeat.unconnectPeer(session);
    }

    @Override
    public void handlePongMessage(
            final WebSocketSession session,
            final PongMessage message
    ) {
        final Peer peer = heartBeat.findPeerBySession(session);
        peer.updatePeerSession(session);
        log.info("Pong received from peer ID {}", session.getId());
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
        final Peer peer = heartBeat.findPeerBySession(session);

        if (peer != null) {
            peer.updatePeerSession(session);

            switch (payload.getType()) {
                case RequestType.CONNECT -> {
                    final PeerConnectRequest data = new ObjectMapper().convertValue(payload.getData(), PeerConnectRequest.class);
                    peer.setDiscoverability(data.getDiscoverability());
                    sendMessage(session, new PeerConnectedResponse(peer.getDevice()));
                    log.info("Peer ID {} connected", peer.getSessionId());
                    handlePeerConnection(peer);
                }
                case RequestType.CHANGE_SETTINGS -> {
                    final PeerChangeDataRequest data = new ObjectMapper().convertValue(payload.getData(), PeerChangeDataRequest.class);
                    peer.setName(data.getName());
                    peer.setDiscoverability(data.getDiscoverability());
                }
                case RequestType.PEER_OFFER -> {
                    final RTCOfferRequest data = new ObjectMapper().convertValue(payload.getData(), RTCOfferRequest.class);
                    final Peer recipientPeer = heartBeat.findPeerById(data.getPeerId());

                    if (recipientPeer != null) {
                        sendMessage(recipientPeer.getSession(), new RTCAnswerResponse(data.getConnectionId(), peer.getSessionId(), data.getOffer()));
                    }
                }
                case RequestType.PEER_ANSWER -> {
                    final RTCAnswerRequest data = new ObjectMapper().convertValue(payload.getData(), RTCAnswerRequest.class);
                    final Peer recipientPeer = heartBeat.findPeerById(data.getPeerId());

                    if (recipientPeer != null) {
                        sendMessage(recipientPeer.getSession(), new RTCApproveAnswerResponse(data.getConnectionId(), peer.getSessionId(), data.getAnswer()));
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
                session.sendMessage(new TextMessage(new ObjectMapper().writeValueAsString(message)));
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private void handlePeerConnection(final Peer peer) {
        final boolean isAlreadyJoined = rooms.stream()
                .anyMatch(room -> room.getPeers().stream().anyMatch(p -> p.getSession().equals(peer.getSession())));

        if (isAlreadyJoined) {
            log.info("Peer ID {} already joined room in network", peer.getSession().getId());
            return;
        }

        if (peer.getDiscoverability().equals(Discoverability.NETWORK)) {
            findDiscoverableRoomsInNetwork(peer);
        }
    }

    private void unconnectPeerFromRooms(final Peer peer) {
        final Optional<Room> rooms = this.rooms.stream()
                .filter(room -> room.getPeers().removeIf(p -> p.getSession().equals(peer.getSession())))
                .findFirst();

        rooms.ifPresent(room -> {
            // Notify remaining peers
            room.getPeers().forEach(other -> {
                if (other.getSession().isOpen()) {
                    sendMessage(other.getSession(), new PeerLeftResponse(peer));
                }
            });

            // Remove the room if empty
            if (room.getPeers().isEmpty()) {
                this.rooms.remove(room);
            }
        });

        log.info("Peer ID {} disconnected and removed", peer.getSession().getId());
    }

    private void findDiscoverableRoomsInNetwork(final Peer joiner) {
        final List<Room> roomsInNetwork = rooms.stream()
                .filter(room -> room.getType().equals(RoomType.NETWORK))
                .filter(room -> room.getIpAddress().equals(joiner.getIpAddress()))
                .filter(room -> !room.getPeers().contains(joiner))
                .toList();

        if (roomsInNetwork.isEmpty()) {
            createRoom(joiner);
        } else {
            for (Room room : roomsInNetwork) {
                connectNewPeerToRoom(room, joiner);
            }
        }
    }

    private void createRoom(final Peer peer) {
        // TODO: Change room ID (code that can be used for connection)
        final Room room = new Room(Integer.toHexString(32), RoomType.NETWORK, peer.getIpAddress());
        rooms.add(room);
        room.addPeer(peer);
    }

    private void connectNewPeerToRoom(Room room, Peer answerer) {
        room.addPeer(answerer);

        for (Peer offerer : room.getPeers()) {
            if (!offerer.getSession().equals(answerer.getSession())) {
                sendMessage(offerer.getSession(), new RTCOfferResponse(UUID.randomUUID(), answerer.getSessionId()));
            }
        }
    }

}
