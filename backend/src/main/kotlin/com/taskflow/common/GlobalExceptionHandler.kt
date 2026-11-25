package com.taskflow.common

import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import java.time.Instant

@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
        val fieldErrors = ex.bindingResult.fieldErrors.map {
            FieldErrorResponse(it.field, it.defaultMessage ?: "Invalid value")
        }
        return build(HttpStatus.BAD_REQUEST, "Validation failed", request, fieldErrors)
    }

    @ExceptionHandler(FieldValidationException::class)
    fun handleFieldValidation(ex: FieldValidationException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
        build(HttpStatus.BAD_REQUEST, "Validation failed", request, listOf(FieldErrorResponse(ex.field, ex.message ?: "Invalid value")))

    @ExceptionHandler(ApiException::class)
    fun handleApiException(ex: ApiException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
        build(ex.status, ex.message ?: ex.status.reasonPhrase, request)

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadable(ex: HttpMessageNotReadableException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
        build(HttpStatus.BAD_REQUEST, "Request body is missing or malformed", request)

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleTypeMismatch(ex: MethodArgumentTypeMismatchException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
        val fieldError = FieldErrorResponse(ex.name, "Invalid value '${ex.value}'")
        return build(HttpStatus.BAD_REQUEST, "Invalid request parameter", request, listOf(fieldError))
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
        log.error("Unexpected error on {} {}", request.method, request.requestURI, ex)
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong. Please try again later.", request)
    }

    private fun build(
        status: HttpStatus,
        message: String,
        request: HttpServletRequest,
        fieldErrors: List<FieldErrorResponse> = emptyList(),
    ): ResponseEntity<ErrorResponse> {
        val body = ErrorResponse(
            timestamp = Instant.now(),
            status = status.value(),
            error = status.reasonPhrase,
            message = message,
            path = request.requestURI,
            fieldErrors = fieldErrors,
        )
        return ResponseEntity.status(status).body(body)
    }
}
