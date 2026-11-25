package com.taskflow.security

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties(prefix = "taskflow.jwt")
data class JwtProperties(
    val secret: String,
    val expiration: Duration,
) {
    init {
        require(secret.length >= 32) { "taskflow.jwt.secret (JWT_SECRET) must be at least 32 characters" }
    }
}
