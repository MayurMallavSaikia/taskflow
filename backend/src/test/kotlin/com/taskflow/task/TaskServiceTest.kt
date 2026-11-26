package com.taskflow.task

import com.taskflow.TestFixtures
import com.taskflow.TestFixtures.TODAY
import com.taskflow.common.FieldValidationException
import com.taskflow.common.NotFoundException
import com.taskflow.project.ProjectService
import com.taskflow.task.activity.TaskActivityService
import com.taskflow.task.sort.CreatedAtSortStrategy
import com.taskflow.task.sort.DueDateSortStrategy
import com.taskflow.task.sort.PrioritySortStrategy
import com.taskflow.task.sort.TaskSortStrategyResolver
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable

class TaskServiceTest {

    private val taskRepository = mockk<TaskRepository>()
    private val projectService = mockk<ProjectService>()
    private val activityService = mockk<TaskActivityService>(relaxed = true)
    private val sortResolver = TaskSortStrategyResolver(
        listOf(CreatedAtSortStrategy(), DueDateSortStrategy(), PrioritySortStrategy()),
    )

    private lateinit var service: TaskService

    private val owner = TestFixtures.user(id = 1L)
    private val project = TestFixtures.project(id = 10L, owner = owner)

    @BeforeEach
    fun setUp() {
        service = TaskService(taskRepository, projectService, sortResolver, activityService, TestFixtures.fixedClock)
        every { projectService.getAccessibleProject(1L, 10L) } returns project
        every { taskRepository.saveAndFlush(any()) } answers { firstArg() }
    }

    @Nested
    inner class CreateTask {

        @Test
        fun `creates task in TODO with the given fields and logs activity`() {
            val assignee = TestFixtures.user(id = 2L, name = "Bob")
            project.members.add(assignee)
            val saved = slot<Task>()
            every { taskRepository.save(capture(saved)) } answers { TestFixtures.task(id = 100L, project = project, assignee = assignee) }

            val request = CreateTaskRequest(
                title = "  Write docs  ",
                priority = TaskPriority.HIGH,
                dueDate = TODAY.plusDays(1),
                assigneeId = 2L,
            )
            val response = service.createTask(1L, 10L, request)

            assertThat(saved.captured.title).isEqualTo("Write docs")
            assertThat(saved.captured.status).isEqualTo(TaskStatus.TODO)
            assertThat(saved.captured.priority).isEqualTo(TaskPriority.HIGH)
            assertThat(saved.captured.assignee).isEqualTo(assignee)
            assertThat(response.assignee?.id).isEqualTo(2L)
            verify { activityService.recordCreated(any(), 1L) }
        }

        @Test
        fun `rejects an assignee who is not a project member with a field error`() {
            // User 99 exists or not, it doesn't matter: only members can be assigned.
            val ex = assertThrows<FieldValidationException> {
                service.createTask(1L, 10L, CreateTaskRequest(title = "x", assigneeId = 99L))
            }

            assertThat(ex.field).isEqualTo("assigneeId")
            assertThat(ex.message).isEqualTo("Assignee must be a member of this project")
            verify(exactly = 0) { taskRepository.save(any()) }
        }

        @Test
        fun `the owner can always be assigned`() {
            val saved = slot<Task>()
            every { taskRepository.save(capture(saved)) } answers { TestFixtures.task(id = 101L, project = project, assignee = owner) }

            service.createTask(1L, 10L, CreateTaskRequest(title = "Mine", assigneeId = 1L))

            assertThat(saved.captured.assignee).isEqualTo(owner)
        }

        @Test
        fun `fails when the project is not owned by the user`() {
            every { projectService.getAccessibleProject(2L, 10L) } throws NotFoundException("Project 10 not found")

            assertThrows<NotFoundException> { service.createTask(2L, 10L, CreateTaskRequest(title = "x")) }
        }
    }

    @Nested
    inner class UpdateTask {

        @Test
        fun `rejects changing the due date to a past date`() {
            val task = TestFixtures.task(project = project, dueDate = TODAY.plusDays(2))
            every { taskRepository.findAccessibleById(100L, 1L) } returns task

            val ex = assertThrows<FieldValidationException> {
                service.updateTask(1L, 100L, updateRequest(dueDate = TODAY.minusDays(1)))
            }

            assertThat(ex.field).isEqualTo("dueDate")
        }

        @Test
        fun `allows editing an overdue task when the due date is unchanged`() {
            val pastDate = TODAY.minusDays(3)
            val task = TestFixtures.task(project = project, dueDate = pastDate)
            every { taskRepository.findAccessibleById(100L, 1L) } returns task

            val response = service.updateTask(1L, 100L, updateRequest(title = "Renamed", dueDate = pastDate))

            assertThat(response.title).isEqualTo("Renamed")
            assertThat(response.overdue).isTrue()
        }

        @Test
        fun `logs a status change when the status is edited`() {
            val task = TestFixtures.task(project = project, status = TaskStatus.TODO)
            every { taskRepository.findAccessibleById(100L, 1L) } returns task

            service.updateTask(1L, 100L, updateRequest(status = TaskStatus.DONE))

            verify { activityService.recordUpdated(task, 1L) }
            verify { activityService.recordStatusChange(task, 1L, TaskStatus.TODO, TaskStatus.DONE) }
        }

        private fun updateRequest(
            title: String = "Task",
            status: TaskStatus = TaskStatus.TODO,
            dueDate: java.time.LocalDate? = null,
        ) = UpdateTaskRequest(title = title, status = status, priority = TaskPriority.MEDIUM, dueDate = dueDate)
    }

    @Test
    fun `updateStatus changes only the status and records activity`() {
        val task = TestFixtures.task(project = project, status = TaskStatus.TODO, priority = TaskPriority.LOW)
        every { taskRepository.findAccessibleById(100L, 1L) } returns task

        val response = service.updateStatus(1L, 100L, UpdateTaskStatusRequest(TaskStatus.IN_PROGRESS))

        assertThat(response.status).isEqualTo(TaskStatus.IN_PROGRESS)
        assertThat(response.priority).isEqualTo(TaskPriority.LOW)
        verify { activityService.recordStatusChange(task, 1L, TaskStatus.TODO, TaskStatus.IN_PROGRESS) }
    }

    @Test
    fun `deleting another user's task returns not found`() {
        every { taskRepository.findAccessibleById(100L, 2L) } returns null

        assertThrows<NotFoundException> { service.deleteTask(2L, 100L) }
        verify(exactly = 0) { taskRepository.delete(any<Task>()) }
    }

    @Test
    fun `deleteTask removes an owned task`() {
        val task = TestFixtures.task(project = project)
        every { taskRepository.findAccessibleById(100L, 1L) } returns task
        every { taskRepository.delete(task) } just runs

        service.deleteTask(1L, 100L)

        verify { taskRepository.delete(task) }
    }

    @Test
    fun `summary returns every status and the overdue count`() {
        every { taskRepository.countByStatus(10L) } returns listOf(
            StatusCount(TaskStatus.TODO, 3),
            StatusCount(TaskStatus.DONE, 1),
        )
        every { taskRepository.countByProjectIdAndStatusNotAndDueDateBefore(10L, TaskStatus.DONE, TODAY) } returns 2

        val summary = service.getSummary(1L, 10L)

        assertThat(summary.countsByStatus).containsExactlyInAnyOrderEntriesOf(
            mapOf(TaskStatus.TODO to 3L, TaskStatus.IN_PROGRESS to 0L, TaskStatus.DONE to 1L),
        )
        assertThat(summary.total).isEqualTo(4)
        assertThat(summary.overdue).isEqualTo(2)
    }

    @Test
    fun `listTasks caps the page size and maps overdue flag`() {
        val pageable = slot<Pageable>()
        val overdueTask = TestFixtures.task(project = project, dueDate = TODAY.minusDays(1))
        every { taskRepository.findAll(any<org.springframework.data.jpa.domain.Specification<Task>>(), capture(pageable)) } answers {
            PageImpl(listOf(overdueTask), PageRequest.of(0, 100), 1)
        }

        val result = service.listTasks(1L, 10L, TaskListQuery(sort = "dueDate", size = 500))

        assertThat(pageable.captured.pageSize).isEqualTo(TaskService.MAX_PAGE_SIZE)
        assertThat(result.content.single().overdue).isTrue()
        assertThat(result.totalElements).isEqualTo(1)
    }
}
