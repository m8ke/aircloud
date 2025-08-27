package com.aircloud.server.socket;

import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

class ConnectionIdGeneratorTest {

    private final Set<Peer> peers = ConcurrentHashMap.newKeySet();

    @Test
    void testThreadSafetyAndUniqueness() {
    }

}