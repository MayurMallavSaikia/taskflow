package com.taskflow.task

import com.taskflow.common.FieldValidationException
import com.taskflow.common.NotFoundException
import com.taskflow.common.PageResponse
import com.taskflow.project.Project
import com.taskflow.project.ProjectService
import com.taskflow.task.activity.TaskActivityResponse
import com.taskflow.task.activity.TaskActivityService
import com.taskflow.task.sort.TaskSortStrategyResolver
import com.taskflow.user.User
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class TaskService(
    private val taskRepository: TaskRepository,
    private val projectService: ProjectService,
    private val sortStrategyResolver: TaskSortStrategyResolver,
    private val activityService: TaskActivityService,
    private val clock: Clock,
) {

    fun listTasks(userId: Long, projectId: Long, query: TaskListQuery): PageResponse<TaskResponse> {
        projectService.getAccessibleProject(userId, projectId)
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
        val project = projectService.getAccessibleProject(userId, projectId)
        val assignee = request.assigneeId?.let { findAssignee(project, it) }
        val task = taskRepository.save(TaskMapper.newTask(request, project, assignee, clock.instant()))
        activityService.recordCreated(task, userId)
        return TaskMapper.toResponse(task, today())
    }

    @Transactional
    fun updateTask(userId: Long, taskId: Long, request: UpdateTaskRequest): TaskResponse {
        val task = getAccessibleTask(userId, taskId)
        val today = today()
        if (request.dueDate != task.dueDate && request.dueDate?.isBefore(today) == true) {
            throw FieldValidationException("dueDate", "Due date cannot be in the past")
        }

        val previousStatus = task.status
        task.title = request.title.trim()
        task.description = request.description?.trim()?.ifBlank { null }
        task.status = requireNotNull(request.status)
        task.priority = requireNotNull(request.priority)
        task.dueDate = request.dueDate
        task.assignee = request.assigneeId?.let { findAssignee(task.project, it) }

        activityService.recordUpdated(task, userId)
        activityService.recordStatusChange(task, userId, previousStatus, task.status)
        return TaskMapper.toResponse(taskRepository.saveAndFlush(task), today)
    }

    @Transactional
    fun updateStatus(userId: Long, taskId: Long, request: UpdateTaskStatusRequest): TaskResponse {
        val task = getAccessibleTask(userId, taskId)
        val previousStatus = task.status
        task.status = requireNotNull(request.status)
        activityService.recordStatusChange(task, userId, previousStatus, task.status)
        return TaskMapper.toResponse(taskRepository.saveAndFlush(task), today())
    }

    @Transactional
    fun deleteTask(userId: Long, taskId: Long) {
        taskRepository.delete(getAccessibleTask(userId, taskId))
    }

    fun getSummary(userId: Long, projectId: Long): ProjectSummaryResponse {
        projectService.getAccessibleProject(userId, projectId)
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

    fun getActivity(userId: Long, taskId: Long): List<TaskActivityResponse> {
        getAccessibleTask(userId, taskId)
        return activityService.listForTask(taskId)
    }

    private fun getAccessibleTask(userId: Long, taskId: Long): Task =
        taskRepository.findAccessibleById(taskId, userId)
            ?: throw NotFoundException("Task $taskId not found")

    /** Only members of the project can be assigned its tasks. */
    private fun findAssignee(project: Project, assigneeId: Long): User =
        project.members.firstOrNull { it.id == assigneeId }
            ?: throw FieldValidationException("assigneeId", "Assignee must be a member of this project")

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
