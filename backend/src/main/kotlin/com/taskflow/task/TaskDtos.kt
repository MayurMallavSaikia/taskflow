package com.taskflow.task

import com.taskflow.user.UserResponse
import jakarta.validation.constraints.FutureOrPresent
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate

data class CreateTaskRequest(
    @field:NotBlank(message = "Title is required")
    @field:Size(max = 120, message = "Title must be at most 120 characters")
    val title: String = "",

    @field:Size(max = 2000, message = "Description must be at most 2000 characters")
    val description: String? = null,

    val priority: TaskPriority = TaskPriority.MEDIUM,

    @field:FutureOrPresent(message = "Due date cannot be in the past")
    val dueDate: LocalDate? = null,

    val assigneeId: Long? = null,
)

/**
 * Full update (PUT). The "due date not in the past" rule is checked in the service instead of here,
 * because editing an already overdue task without touching the date should still work.
 */
data class UpdateTaskRequest(
    @field:NotBlank(message = "Title is required")
    @field:Size(max = 120, message = "Title must be at most 120 characters")
    val title: String = "",

    @field:Size(max = 2000, message = "Description must be at most 2000 characters")
    val description: String? = null,

    @field:NotNull(message = "Status is required")
    val status: TaskStatus? = null,

    @field:NotNull(message = "Priority is required")
    val priority: TaskPriority? = null,

    val dueDate: LocalDate? = null,

    val assigneeId: Long? = null,
)

data class UpdateTaskStatusRequest(
    @field:NotNull(message = "Status is required")
    val status: TaskStatus? = null,
)

data class TaskResponse(
    val id: Long,
    val projectId: Long,
    val title: String,
    val description: String?,
    val status: TaskStatus,
    val priority: TaskPriority,
    val dueDate: LocalDate?,
    val overdue: Boolean,
    val assignee: UserResponse?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

data class ProjectSummaryResponse(
    val projectId: Long,
    val total: Long,
    val countsByStatus: Map<TaskStatus, Long>,
    val overdue: Long,
)
