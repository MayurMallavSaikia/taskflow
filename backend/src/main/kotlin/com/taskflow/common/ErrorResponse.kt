package com.taskflow.common

import java.time.Instant

data class ErrorResponse(
    val timestamp: Instant,
    val status: Int,
    val error: String,
    val message: String,
    val path: String,
    val fieldErrors: List<FieldErrorResponse> = emptyList(),
)

data class FieldErrorResponse(
    val field: String,
    val message: String,
)
