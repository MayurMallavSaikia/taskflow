package com.taskflow.auth

import com.taskflow.common.ConflictException
import com.taskflow.common.NotFoundException
import com.taskflow.common.UnauthorizedException
import com.taskflow.config.DemoDataSeeder
import com.taskflow.security.JwtService
import com.taskflow.user.User
import com.taskflow.user.UserRepository
import com.taskflow.user.UserResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
    private val clock: Clock,
    @Value("\${taskflow.guest.enabled:true}") private val guestEnabled: Boolean,
) {

    @Transactional
    fun register(request: RegisterRequest): AuthResponse {
        val email = normalizeEmail(request.email)
        if (userRepository.existsByEmail(email)) {
            throw ConflictException("An account with this email already exists")
        }
        val user = userRepository.save(
            User(
                name = request.name.trim(),
                email = email,
                passwordHash = passwordEncoder.encode(request.password),
                createdAt = clock.instant(),
            ),
        )
        return issueToken(user)
    }

    @Transactional(readOnly = true)
    fun login(request: LoginRequest): AuthResponse {
        val user = userRepository.findByEmail(normalizeEmail(request.email))
        // Same message for unknown email and wrong password so we don't leak which emails exist.
        if (user == null || !passwordEncoder.matches(request.password, user.passwordHash)) {
            throw UnauthorizedException("Invalid email or password")
        }
        return issueToken(user)
    }

    /**
     * One-click login as the shared demo account (demo@taskflow.dev, created by [DemoDataSeeder]).
     * The frontend never needs the demo password. Everyone using guest login shares this account's data.
     */
    @Transactional(readOnly = true)
    fun loginAsGuest(): AuthResponse {
        if (!guestEnabled) throw NotFoundException("Guest login is disabled")
        val demo = userRepository.findByEmail(DemoDataSeeder.DEMO_EMAIL)
            ?: throw NotFoundException("Guest login is not available because the demo account does not exist")
        return issueToken(demo)
    }

    private fun issueToken(user: User): AuthResponse {
        val issued = jwtService.generateToken(requireNotNull(user.id), user.email)
        return AuthResponse(token = issued.token, expiresAt = issued.expiresAt, user = UserResponse.from(user))
    }

    private fun normalizeEmail(email: String) = email.trim().lowercase()
}
