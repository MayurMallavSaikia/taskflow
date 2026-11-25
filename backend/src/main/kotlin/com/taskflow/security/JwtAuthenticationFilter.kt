package com.taskflow.security

import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.JwtException
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Reads the bearer token and, if it is valid, puts the user into the security context.
 * If the token is missing or invalid we just continue; Spring Security will reject the request
 * for protected endpoints and [RestAuthenticationEntryPoint] writes the 401 response.
 *
 * Not a @Component on purpose - otherwise Spring Boot would also register it as a plain servlet filter.
 */
class JwtAuthenticationFilter(private val jwtService: JwtService) : OncePerRequestFilter() {

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, filterChain: FilterChain) {
        val header = request.getHeader(HttpHeaders.AUTHORIZATION)
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            authenticate(header.removePrefix(BEARER_PREFIX).trim(), request)
        }
        filterChain.doFilter(request, response)
    }

    private fun authenticate(token: String, request: HttpServletRequest) {
        try {
            val user = jwtService.parseToken(token)
            val authentication = UsernamePasswordAuthenticationToken(user, null, emptyList())
            SecurityContextHolder.getContext().authentication = authentication
        } catch (ex: ExpiredJwtException) {
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Your session has expired. Please log in again.")
        } catch (ex: JwtException) {
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Invalid authentication token")
        } catch (ex: IllegalArgumentException) {
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Invalid authentication token")
        }
    }

    companion object {
        const val AUTH_ERROR_ATTRIBUTE = "taskflow.auth.error"
        private const val BEARER_PREFIX = "Bearer "
    }
}
