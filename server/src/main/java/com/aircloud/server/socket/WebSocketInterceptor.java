package com.aircloud.server.socket;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

public class WebSocketInterceptor implements HandshakeInterceptor {

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            final HttpServletRequest httpRequest = servletRequest.getServletRequest();

            final String userAgent = httpRequest.getHeader("User-Agent");
            String ipAddress = httpRequest.getRemoteAddr();

            // As fallback, check headers manually
            if (ipAddress == null || ipAddress.startsWith("127.") || ipAddress.startsWith("0:0:0:0:0:0:0:1")) {
                ipAddress = httpRequest.getHeader("X-Forwarded-For");
                if (ipAddress == null) {
                    ipAddress = httpRequest.getHeader("X-Real-IP");
                }
            }

            attributes.put("userAgent", userAgent);
            attributes.put("ipAddress", ipAddress);
        }
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
    }
}
