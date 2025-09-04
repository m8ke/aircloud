package com.aircloud.server.socket;

import com.aircloud.server.socket.dto.request.*;
import com.aircloud.server.socket.dto.response.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${aircloud.turn.stun-ip}")
    private String STUN_IP;

    @Value("${aircloud.turn.turn-ip}")
    private String TURN_IP;

    private final static int HEARTBEAT_PERIOD = 15;

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
        log.info("Pong received from peer ID {}", peer.getPeerId());
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
        }, 0, WebSocketHandler.HEARTBEAT_PERIOD, TimeUnit.SECONDS);
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
    ) throws Exception {
        final BaseRequest payload = new ObjectMapper().readValue(message.getPayload(), BaseRequest.class);
        final Peer peer = findPeerBySession(session);

        if (peer != null) {
            peer.updatePeerSession(session);

            switch (payload.getType()) {
                case RequestType.CONNECT -> handleConnect(session, peer, payload);
                case RequestType.OFFER -> handleOffer(peer, payload);
                case RequestType.ANSWER -> handleAnswer(peer, payload);
                case RequestType.PEER_CONNECT -> handlePeerConnect(session, payload);
                case RequestType.PEER_RECONNECT -> handlePeerReconnect(session, payload);
                case RequestType.CHANGE_SETTINGS -> handleChangeSettings(peer, payload);
                case RequestType.ICE_CANDIDATE -> handleIceCandidate(session, payload);
                case RequestType.END_OF_ICE_CANDIDATES -> handleEndOfIceCandidates(session, payload);
            }
        }
    }

    private void connectPeer(final WebSocketSession session) {
        final Peer peer = new Peer(session);
        peers.add(peer);
    }

    private void unconnectPeer(final WebSocketSession session) {
        final Peer peer = findPeerBySession(session);
        peers.remove(peer);
        unconnectPeerInNetwork(peer);
        log.info("Peer ID {} disconnected", peer.getPeerId());
    }

    private void handleChangeSettings(
            final Peer peer,
            final BaseRequest payload
    ) {
        final PeerChangeSettingsRequest data = new ObjectMapper().convertValue(payload.getData(), PeerChangeSettingsRequest.class);
        peer.setName(data.getName());
        peer.setConnectionId(data.getConnectionId());
        peer.setDiscoverability(data.getDiscoverability());
    }

    private void handlePeerConnect(
            final WebSocketSession session,
            final BaseRequest payload
    ) {
        final ConnectPeerRequest data = new ObjectMapper().convertValue(payload.getData(), ConnectPeerRequest.class);
        final String connectionId = data.getConnectionId();
        final Peer peerA = findPeerByConnectionId(connectionId);

        if (peerA != null) {
            final Peer peerB = findPeerBySession(session);
            establishConnectionBetweenPeers(peerA, peerB, ConnectionType.MANUAL);
            sendMessage(session, new PeerManualConnectResponse(peerA.getPeerId(), true));
        } else {
            sendMessage(session, new PeerManualConnectResponse(null, false));
        }
    }

    private void handlePeerReconnect(WebSocketSession session, BaseRequest payload) {
        final ReconnectPeerRequest data = new ObjectMapper().convertValue(payload.getData(), ReconnectPeerRequest.class);
        final Peer peerA = findPeerById(data.getPeerId());

        if (peerA != null) {
            final Peer peerB = findPeerBySession(session);
            establishConnectionBetweenPeers(peerA, peerB, ConnectionType.MANUAL); // TODO: Is it manual?
        }
    }

    private void handleIceCandidate(WebSocketSession session, BaseRequest payload) {
        final IceCandidateRequest data = new ObjectMapper().convertValue(payload.getData(), IceCandidateRequest.class);
        final Peer peerA = findPeerById(data.getPeerId());

        if (peerA != null) {
            final Peer peerB = findPeerBySession(session);
            sendMessage(peerA.getSession(), new IceCandidateResponse(peerB.getPeerId(), data.getCandidate()));
        }
    }

    private void handleEndOfIceCandidates(WebSocketSession session, BaseRequest payload) {
        final EndOfIceCandidateRequest data = new ObjectMapper().convertValue(payload.getData(), EndOfIceCandidateRequest.class);
        final Peer peerA = findPeerById(data.getPeerId());

        if (peerA != null) {
            final Peer peerB = findPeerBySession(session);
            sendMessage(peerA.getSession(), new EndOfIceCandidatesResponse(peerB.getPeerId()));
        }
    }

    private void handleAnswer(
            final Peer peerA,
            final BaseRequest payload
    ) {
        final RTCAnswerRequest data = new ObjectMapper().convertValue(payload.getData(), RTCAnswerRequest.class);
        final Peer peerB = findPeerById(data.getPeerId());

        if (peerB != null) {
            sendMessage(peerB.getSession(), new RTCApproveAnswerResponse(
                    peerA.getPeerId(),
                    data.getAnswer())
            );
        }
    }

    private void handleOffer(
            final Peer peerA,
            final BaseRequest payload
    ) {
        final RTCOfferRequest data = new ObjectMapper().convertValue(payload.getData(), RTCOfferRequest.class);
        final Peer peerB = findPeerById(data.getPeerId());

        if (peerB != null) {
            sendMessage(peerB.getSession(), new RTCAnswerResponse(
                    peerA.getPeerId(),
                    data.getOffer(),
                    peerA.getName(),
                    peerA.getDevice(),
                    data.getConnectionType()
            ));
        }
    }

    private void handleConnect(
            final WebSocketSession session,
            final Peer peer,
            final BaseRequest payload
    ) throws Exception {
        final String connectionId = ConnectionIdGenerator.generateConnectionId(6, peers);
        final PeerConnectRequest data = new ObjectMapper().convertValue(payload.getData(), PeerConnectRequest.class);

        peer.setName(data.getName());
        peer.setPeerId(data.getPeerId());
        peer.setConnectionId(connectionId);
        peer.setDiscoverability(data.getDiscoverability());

        final TurnServerCredential.EphemeralCred cred = TurnServerCredential.generate(session.getId(), 3600);

        final IceServer stun = new IceServer();
        stun.setUrls(STUN_IP);

        final IceServer turn = new IceServer();
        turn.setUrls(TURN_IP);
        turn.setUsername(cred.username());
        turn.setCredential(cred.credential());

        final List<IceServer> iceServers = Arrays.asList(stun, turn);

        sendMessage(session, new PeerConnectResponse(peer.getPeerId(), peer.getConnectionId(), iceServers));
        log.info("Peer ID {} connected", peer.getPeerId());

        handlePeerConnection(peer);
    }

    private Peer findPeerByConnectionId(
            final String connectionId
    ) {
        return peers.stream()
                .filter(p -> p.getConnectionId().equals(connectionId))
                .findFirst()
                .orElse(null);
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
            throw new RuntimeException("Can't send the message due to disconnection");
        }
    }

    private void handlePeerConnection(final Peer peerA) {
        if (peerA.getDiscoverability().equals(Discoverability.NETWORK)) {
            for (Peer peerB : findPeersInNetwork(peerA)) {
                establishConnectionBetweenPeers(peerB, peerA, ConnectionType.NETWORK);
            }
        }
    }

    private List<Peer> findPeersInNetwork(final Peer peer) {
        return peers.stream()
                .filter(p -> p.getDiscoverability().equals(Discoverability.NETWORK))
                .filter(p -> Objects.equals(p.getIpAddress(), peer.getIpAddress()))
                .filter(p -> !p.equals(peer))
                .filter(Peer::isActive)
                .toList();
    }

    private void unconnectPeerInNetwork(final Peer peer) {
        for (Peer p : findPeersInNetwork(peer)) {
            sendMessage(p.getSession(), new PeerDisconnectResponse(peer.getPeerId()));
        }
    }

    private void establishConnectionBetweenPeers(
            final Peer peerA,
            final Peer peerB,
            final ConnectionType connectionType
    ) {
        if (!peerA.equals(peerB)) {
            log.info("Peer-A ID {} and peer-B ID {} connected through {} connection", peerA.getPeerId(), peerB.getPeerId(), connectionType);
            sendMessage(peerA.getSession(), new RTCOfferResponse(peerB.getPeerId(), peerB.getName(), peerB.getDevice(), connectionType));
        }
    }

    private Peer findPeerBySession(final WebSocketSession session) {
        return peers.stream()
                .filter(peer -> peer.getSession().equals(session))
                .findFirst()
                .orElse(null);
    }

    private Peer findPeerById(final UUID peerId) {
        return peers.stream()
                .filter(p -> p.getPeerId() != null && p.getPeerId().equals(peerId)).findFirst()
                .orElse(null);
    }

}
