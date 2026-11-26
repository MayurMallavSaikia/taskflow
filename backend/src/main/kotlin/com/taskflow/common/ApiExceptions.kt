package com.taskflow.common

import org.springframework.http.HttpStatus

open class ApiException(val status: HttpStatus, message: String) : RuntimeException(message)

class NotFoundException(message: String) : ApiException(HttpStatus.NOT_FOUND, message)

class ConflictException(message: String) : ApiException(HttpStatus.CONFLICT, message)

class BadRequestException(message: String) : ApiException(HttpStatus.BAD_REQUEST, message)

class UnauthorizedException(message: String) : ApiException(HttpStatus.UNAUTHORIZED, message)

/** The user can see the resource but isn't allowed to do this to it (e.g. a member managing members). */
class ForbiddenException(message: String) : ApiException(HttpStatus.FORBIDDEN, message)

/**
 * Used for validation rules that can't be expressed with bean validation annotations
 * (e.g. rules that depend on the current state of the entity).
 */
class FieldValidationException(val field: String, message: String) : ApiException(HttpStatus.BAD_REQUEST, message)
