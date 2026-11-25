package com.taskflow.task

import com.taskflow.project.Project
import com.taskflow.user.User
import com.taskflow.user.UserResponse
import java.time.Instant
import java.time.LocalDate

/**
 * Factory for creating Task entities from requests and mapping them back to response DTOs,
 * so controllers never see JPA entities.
 */
object TaskMapper {

    fun newTask(request: CreateTaskRequest, project: Project, assignee: User?, now: Instant): Task =
        Task(
            title = request.title.trim(),
            description = request.description?.trim()?.ifBlank { null },
            status = TaskStatus.TODO,
            priority = request.priority,
            dueDate = request.dueDate,
            assignee = assignee,
            project = project,
            createdAt = now,
            updatedAt = now,
        )

    fun toResponse(task: Task, today: LocalDate): TaskResponse =
        TaskResponse(
            id = requireNotNull(task.id),
            projectId = requireNotNull(task.project.id),
            title = task.title,
            description = task.description,
            status = task.status,
            priority = task.priority,
            dueDate = task.dueDate,
            overdue = task.isOverdue(today),
            assignee = task.assignee?.let(UserResponse::from),
            createdAt = task.createdAt,
            updatedAt = task.updatedAt,
        )
}
