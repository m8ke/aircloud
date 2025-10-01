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
            final ServerHttpRequest request,
            final ServerHttpResponse response,
            final WebSocketHandler wsHandler,
            final Map<String, Object> attributes
    ) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            final HttpServletRequest httpRequest = servletRequest.getServletRequest();

            final String userAgent = httpRequest.getHeader("user-agent");
            String ipAddress;

            if (httpRequest.getHeader("cf-connecting-ip") != null) {
                ipAddress = httpRequest.getHeader("cf-connecting-ip");
            } else if (httpRequest.getHeader("x-forwarded-for") != null) {
                ipAddress = httpRequest.getHeader("x-forwarded-for");
            } else {
                ipAddress = httpRequest.getRemoteAddr();
            }

            attributes.put("userAgent", userAgent);
            attributes.put("ipAddress", ipAddress);
        }

        return true;
    }

    @Override
    public void afterHandshake(
            final ServerHttpRequest request,
            final ServerHttpResponse response,
            final WebSocketHandler wsHandler,
            final Exception exception
    ) {
    }
}
