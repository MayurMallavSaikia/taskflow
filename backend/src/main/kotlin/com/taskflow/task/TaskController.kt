package com.taskflow.task

import com.taskflow.common.BadRequestException
import com.taskflow.common.PageResponse
import com.taskflow.security.AuthUser
import jakarta.validation.Valid
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class TaskController(private val taskService: TaskService) {

    @GetMapping("/projects/{projectId}/tasks")
    fun listTasks(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable projectId: Long,
        @RequestParam(required = false) status: TaskStatus?,
        @RequestParam(required = false) priority: TaskPriority?,
        @RequestParam(required = false) assigneeId: Long?,
        @RequestParam(defaultValue = "createdAt") sort: String,
        @RequestParam(defaultValue = "asc") direction: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<TaskResponse> {
        val query = TaskListQuery(
            filter = TaskFilter(status, priority, assigneeId),
            sort = sort,
            direction = parseDirection(direction),
            page = page,
            size = size,
        )
        return taskService.listTasks(user.id, projectId, query)
    }

    @PostMapping("/projects/{projectId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    fun createTask(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable projectId: Long,
        @Valid @RequestBody request: CreateTaskRequest,
    ): TaskResponse = taskService.createTask(user.id, projectId, request)

    @GetMapping("/projects/{projectId}/summary")
    fun getSummary(@AuthenticationPrincipal user: AuthUser, @PathVariable projectId: Long): ProjectSummaryResponse =
        taskService.getSummary(user.id, projectId)

    @PutMapping("/tasks/{taskId}")
    fun updateTask(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable taskId: Long,
        @Valid @RequestBody request: UpdateTaskRequest,
    ): TaskResponse = taskService.updateTask(user.id, taskId, request)

    @PatchMapping("/tasks/{taskId}/status")
    fun updateStatus(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable taskId: Long,
        @Valid @RequestBody request: UpdateTaskStatusRequest,
    ): TaskResponse = taskService.updateStatus(user.id, taskId, request)

    @DeleteMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteTask(@AuthenticationPrincipal user: AuthUser, @PathVariable taskId: Long) {
        taskService.deleteTask(user.id, taskId)
    }

    private fun parseDirection(value: String): Sort.Direction =
        Sort.Direction.fromOptionalString(value)
            .orElseThrow { BadRequestException("Unsupported direction '$value'. Allowed values: asc, desc") }
}
