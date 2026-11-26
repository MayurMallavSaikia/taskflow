package com.taskflow.auth

import com.taskflow.TestFixtures
import com.taskflow.common.ConflictException
import com.taskflow.common.NotFoundException
import com.taskflow.common.UnauthorizedException
import com.taskflow.config.DemoDataSeeder
import com.taskflow.security.IssuedToken
import com.taskflow.security.JwtService
import com.taskflow.user.User
import com.taskflow.user.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.crypto.password.PasswordEncoder

class AuthServiceTest {

    private val userRepository = mockk<UserRepository>()
    private val passwordEncoder = mockk<PasswordEncoder>()
    private val jwtService = mockk<JwtService>()
    private val service = authService(guestEnabled = true)

    private fun authService(guestEnabled: Boolean) =
        AuthService(userRepository, passwordEncoder, jwtService, TestFixtures.fixedClock, guestEnabled)

    @Test
    fun `guest login signs in as the demo account without a password`() {
        val demo = TestFixtures.user(id = 7L, name = "Demo User", email = DemoDataSeeder.DEMO_EMAIL)
        every { userRepository.findByEmail(DemoDataSeeder.DEMO_EMAIL) } returns demo
        every { jwtService.generateToken(7L, DemoDataSeeder.DEMO_EMAIL) } returns IssuedToken("jwt", TestFixtures.NOW)

        val response = service.loginAsGuest()

        assertThat(response.token).isEqualTo("jwt")
        assertThat(response.user.email).isEqualTo(DemoDataSeeder.DEMO_EMAIL)
        verify(exactly = 0) { userRepository.save(any()) }
    }

    @Test
    fun `guest login fails when the demo account has not been seeded`() {
        every { userRepository.findByEmail(DemoDataSeeder.DEMO_EMAIL) } returns null

        assertThrows<NotFoundException> { service.loginAsGuest() }
    }

    @Test
    fun `guest login is rejected when disabled`() {
        assertThrows<NotFoundException> { authService(guestEnabled = false).loginAsGuest() }
        verify(exactly = 0) { userRepository.findByEmail(any()) }
    }

    @Test
    fun `register hashes the password, normalises the email and returns a token`() {
        every { userRepository.existsByEmail("ann@example.com") } returns false
        every { passwordEncoder.encode("secret123") } returns "hashed"
        val saved = slot<User>()
        every { userRepository.save(capture(saved)) } answers { TestFixtures.user(id = 1L) }
        every { jwtService.generateToken(1L, "ann@example.com") } returns IssuedToken("jwt", TestFixtures.NOW)

        val response = service.register(RegisterRequest("Ann", "  Ann@Example.com ", "secret123"))

        assertThat(saved.captured.email).isEqualTo("ann@example.com")
        assertThat(saved.captured.passwordHash).isEqualTo("hashed")
        assertThat(response.token).isEqualTo("jwt")
    }

    @Test
    fun `register rejects a duplicate email`() {
        every { userRepository.existsByEmail("ann@example.com") } returns true

        assertThrows<ConflictException> { service.register(RegisterRequest("Ann", "ann@example.com", "secret123")) }
        verify(exactly = 0) { userRepository.save(any()) }
    }

    @Test
    fun `login fails with wrong password`() {
        every { userRepository.findByEmail("ann@example.com") } returns TestFixtures.user()
        every { passwordEncoder.matches("wrong", "hashed") } returns false

        assertThrows<UnauthorizedException> { service.login(LoginRequest("ann@example.com", "wrong")) }
    }

    @Test
    fun `login fails with unknown email`() {
        every { userRepository.findByEmail("nobody@example.com") } returns null

        assertThrows<UnauthorizedException> { service.login(LoginRequest("nobody@example.com", "whatever")) }
    }
}
