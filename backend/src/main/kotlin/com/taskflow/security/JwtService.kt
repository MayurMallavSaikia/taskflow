package com.taskflow.security

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Instant
import java.util.Date
import javax.crypto.SecretKey

data class IssuedToken(val token: String, val expiresAt: Instant)

@Service
class JwtService(
    private val properties: JwtProperties,
    private val clock: Clock,
) {
    private val key: SecretKey = Keys.hmacShaKeyFor(properties.secret.toByteArray())

    fun generateToken(userId: Long, email: String): IssuedToken {
        val now = clock.instant()
        val expiresAt = now.plus(properties.expiration)
        val token = Jwts.builder()
            .subject(userId.toString())
            .claim(EMAIL_CLAIM, email)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(key)
            .compact()
        return IssuedToken(token, expiresAt)
    }

    /**
     * Throws a [io.jsonwebtoken.JwtException] if the token is invalid or expired.
     */
    fun parseToken(token: String): AuthUser {
        val claims = Jwts.parser()
            .verifyWith(key)
            .clock { Date.from(clock.instant()) }
            .build()
            .parseSignedClaims(token)
            .payload
        return AuthUser(
            id = claims.subject.toLong(),
            email = claims.get(EMAIL_CLAIM, String::class.java),
        )
    }

    companion object {
        private const val EMAIL_CLAIM = "email"
    }
}
