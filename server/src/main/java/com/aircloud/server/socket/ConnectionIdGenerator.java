package com.aircloud.server.socket;

import java.security.SecureRandom;
import java.util.Set;

public class ConnectionIdGenerator {

    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateConnectionId(final int length, final Set<Peer> peers) {
        synchronized (peers) {
            String id;

            do {
                id = randomId(length);
            } while (isDuplicate(id, peers));

            return id;
        }
    }

    private static String randomId(final int length) {
        final StringBuilder sb = new StringBuilder(length);

        for (int i = 0; i < length; i++) {
            int index = RANDOM.nextInt(CHARACTERS.length());
            sb.append(CHARACTERS.charAt(index));
        }

        return sb.toString();
    }

    private static boolean isDuplicate(final String id, final Set<Peer> peers) {
        for (Peer peer : peers) {
            if (id.equals(peer.getConnectionId())) {
                return true;
            }
        }
        return false;
    }

}
