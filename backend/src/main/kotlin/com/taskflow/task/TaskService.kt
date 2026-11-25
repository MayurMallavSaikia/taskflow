package com.taskflow.task

import com.taskflow.common.FieldValidationException
import com.taskflow.common.NotFoundException
import com.taskflow.common.PageResponse
import com.taskflow.project.ProjectService
import com.taskflow.task.sort.TaskSortStrategyResolver
import com.taskflow.user.User
import com.taskflow.user.UserRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class TaskService(
    private val taskRepository: TaskRepository,
    private val userRepository: UserRepository,
    private val projectService: ProjectService,
    private val sortStrategyResolver: TaskSortStrategyResolver,
    private val clock: Clock,
) {

    fun listTasks(userId: Long, projectId: Long, query: TaskListQuery): PageResponse<TaskResponse> {
        projectService.getOwnedProject(userId, projectId)
        val strategy = sortStrategyResolver.resolve(query.sort)
        val spec = TaskSpecifications.forProject(projectId, query.filter)
            .and(TaskSpecifications.orderedBy(strategy, query.direction))
        val pageable = PageRequest.of(query.page.coerceAtLeast(0), query.size.coerceIn(1, MAX_PAGE_SIZE))

        val today = today()
        val page = taskRepository.findAll(spec, pageable)
        return PageResponse.from(page) { TaskMapper.toResponse(it, today) }
    }

    @Transactional
    fun createTask(userId: Long, projectId: Long, request: CreateTaskRequest): TaskResponse {
        val project = projectService.getOwnedProject(userId, projectId)
        val assignee = request.assigneeId?.let(::findAssignee)
        val task = taskRepository.save(TaskMapper.newTask(request, project, assignee, clock.instant()))
        return TaskMapper.toResponse(task, today())
    }

    @Transactional
    fun updateTask(userId: Long, taskId: Long, request: UpdateTaskRequest): TaskResponse {
        val task = getOwnedTask(userId, taskId)
        val today = today()
        if (request.dueDate != task.dueDate && request.dueDate?.isBefore(today) == true) {
            throw FieldValidationException("dueDate", "Due date cannot be in the past")
        }

        task.title = request.title.trim()
        task.description = request.description?.trim()?.ifBlank { null }
        task.status = requireNotNull(request.status)
        task.priority = requireNotNull(request.priority)
        task.dueDate = request.dueDate
        task.assignee = request.assigneeId?.let(::findAssignee)

        return TaskMapper.toResponse(taskRepository.saveAndFlush(task), today)
    }

    @Transactional
    fun updateStatus(userId: Long, taskId: Long, request: UpdateTaskStatusRequest): TaskResponse {
        val task = getOwnedTask(userId, taskId)
        task.status = requireNotNull(request.status)
        return TaskMapper.toResponse(taskRepository.saveAndFlush(task), today())
    }

    @Transactional
    fun deleteTask(userId: Long, taskId: Long) {
        taskRepository.delete(getOwnedTask(userId, taskId))
    }

    fun getSummary(userId: Long, projectId: Long): ProjectSummaryResponse {
        projectService.getOwnedProject(userId, projectId)
        val counts = taskRepository.countByStatus(projectId).associate { it.status to it.count }
        // Always return every status so the client doesn't have to handle missing keys.
        val countsByStatus = TaskStatus.entries.associateWith { counts[it] ?: 0L }
        val overdue = taskRepository.countByProjectIdAndStatusNotAndDueDateBefore(projectId, TaskStatus.DONE, today())
        return ProjectSummaryResponse(
            projectId = projectId,
            total = countsByStatus.values.sum(),
            countsByStatus = countsByStatus,
            overdue = overdue,
        )
    }

    private fun getOwnedTask(userId: Long, taskId: Long): Task =
        taskRepository.findByIdAndProjectOwnerId(taskId, userId)
            ?: throw NotFoundException("Task $taskId not found")

    private fun findAssignee(assigneeId: Long): User =
        userRepository.findByIdOrNull(assigneeId)
            ?: throw FieldValidationException("assigneeId", "Assignee $assigneeId does not exist")

    private fun today(): LocalDate = LocalDate.now(clock)

    companion object {
        const val MAX_PAGE_SIZE = 100
    }
}

data class TaskListQuery(
    val filter: TaskFilter = TaskFilter(),
    val sort: String = "createdAt",
    val direction: Sort.Direction = Sort.Direction.ASC,
    val page: Int = 0,
    val size: Int = 20,
)
