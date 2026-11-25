package com.taskflow

import com.taskflow.project.Project
import com.taskflow.task.Task
import com.taskflow.task.TaskPriority
import com.taskflow.task.TaskStatus
import com.taskflow.user.User
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

object TestFixtures {

    val NOW: Instant = Instant.parse("2026-03-10T10:00:00Z")
    val TODAY: LocalDate = LocalDate.of(2026, 3, 10)
    val fixedClock: Clock = Clock.fixed(NOW, ZoneOffset.UTC)

    fun user(id: Long = 1L, name: String = "Ann", email: String = "ann@example.com") =
        User(name = name, email = email, passwordHash = "hashed", createdAt = NOW, id = id)

    fun project(id: Long = 10L, owner: User = user()) =
        Project(name = "Project $id", description = null, owner = owner, createdAt = NOW, id = id)

    fun task(
        id: Long = 100L,
        project: Project = project(),
        status: TaskStatus = TaskStatus.TODO,
        priority: TaskPriority = TaskPriority.MEDIUM,
        dueDate: LocalDate? = null,
        assignee: User? = null,
    ) = Task(
        title = "Task $id",
        description = null,
        status = status,
        priority = priority,
        dueDate = dueDate,
        assignee = assignee,
        project = project,
        createdAt = NOW,
        updatedAt = NOW,
        id = id,
    )
}
