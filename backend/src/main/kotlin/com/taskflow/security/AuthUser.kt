package com.taskflow.security

/**
 * The authenticated user, built from the JWT claims. Available in controllers via @AuthenticationPrincipal.
 */
data class AuthUser(
    val id: Long,
    val email: String,
)
