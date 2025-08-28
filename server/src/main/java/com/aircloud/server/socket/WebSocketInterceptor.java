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
            HttpServletRequest httpRequest = servletRequest.getServletRequest();
            String userAgent = servletRequest.getServletRequest().getHeader("User-Agent");
            attributes.put("userAgent", userAgent);

            String ipAddress = httpRequest.getHeader("X-Forwarded-For");

            if (ipAddress == null) {
                ipAddress = httpRequest.getHeader("X-Real-IP");
            }

            if (ipAddress == null) {
                ipAddress = httpRequest.getRemoteAddr(); // fallback
            }

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
