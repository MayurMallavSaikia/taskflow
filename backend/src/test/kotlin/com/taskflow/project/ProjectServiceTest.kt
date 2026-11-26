package com.taskflow.project

import com.taskflow.TestFixtures
import com.taskflow.common.BadRequestException
import com.taskflow.common.ForbiddenException
import com.taskflow.common.NotFoundException
import com.taskflow.task.TaskRepository
import com.taskflow.user.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.util.Optional

class ProjectServiceTest {

    private val projectRepository = mockk<ProjectRepository>()
    private val userRepository = mockk<UserRepository>()
    private val taskRepository = mockk<TaskRepository>()
    private val service = ProjectService(projectRepository, userRepository, taskRepository, TestFixtures.fixedClock)

    @Test
    fun `lists the projects the user owns or is a member of`() {
        val owner = TestFixtures.user(id = 1L)
        every { projectRepository.findAllAccessibleBy(1L) } returns listOf(
            TestFixtures.project(id = 10L, owner = owner),
            TestFixtures.project(id = 11L, owner = owner),
        )

        val result = service.listProjects(1L)

        assertThat(result.map { it.id }).containsExactly(10L, 11L)
    }

    @Test
    fun `creates project owned by the current user`() {
        val owner = TestFixtures.user(id = 1L)
        every { userRepository.findById(1L) } returns Optional.of(owner)
        val saved = slot<Project>()
        every { projectRepository.save(capture(saved)) } answers {
            Project(saved.captured.name, saved.captured.description, owner, TestFixtures.NOW, id = 42L)
        }

        val response = service.createProject(1L, CreateProjectRequest(name = " Launch ", description = "  "))

        assertThat(saved.captured.name).isEqualTo("Launch")
        assertThat(saved.captured.description).isNull()
        assertThat(saved.captured.owner).isEqualTo(owner)
        assertThat(response.id).isEqualTo(42L)
    }

    @Test
    fun `getOwnedProject throws not found for someone else's project`() {
        every { projectRepository.findAccessibleById(10L, 2L) } returns null

        assertThrows<NotFoundException> { service.getOwnedProject(2L, 10L) }
    }

    @Test
    fun `a new project has its owner as the only member`() {
        val owner = TestFixtures.user(id = 1L)

        assertThat(TestFixtures.project(owner = owner).members.map { it.id }).containsExactly(1L)
    }

    @Test
    fun `adds a member once and returns the members sorted by name`() {
        val owner = TestFixtures.user(id = 1L, name = "Zoe")
        val project = TestFixtures.project(id = 10L, owner = owner)
        val bob = TestFixtures.user(id = 2L, name = "Bob", email = "bob@example.com")
        every { projectRepository.findAccessibleById(10L, 1L) } returns project
        every { userRepository.findById(2L) } returns Optional.of(bob)

        service.addMember(1L, 10L, 2L)
        val result = service.addMember(1L, 10L, 2L)

        assertThat(result.map { it.name }).containsExactly("Bob", "Zoe")
        verify(exactly = 1) { userRepository.findById(2L) }
    }

    @Test
    fun `adding an unknown user fails with not found`() {
        every { projectRepository.findAccessibleById(10L, 1L) } returns TestFixtures.project(id = 10L)
        every { userRepository.findById(99L) } returns Optional.empty()

        assertThrows<NotFoundException> { service.addMember(1L, 10L, 99L) }
    }

    @Test
    fun `removing a member unassigns their tasks in the project`() {
        val project = TestFixtures.project(id = 10L).apply { members.add(TestFixtures.user(id = 2L, name = "Bob")) }
        every { projectRepository.findAccessibleById(10L, 1L) } returns project
        every { projectRepository.saveAndFlush(project) } returns project
        every { taskRepository.unassignUserInProject(10L, 2L, TestFixtures.NOW) } returns 3

        val result = service.removeMember(1L, 10L, 2L)

        assertThat(result.map { it.id }).containsExactly(1L)
        verify { taskRepository.unassignUserInProject(10L, 2L, TestFixtures.NOW) }
    }

    @Test
    fun `a member can see the project but not manage its members`() {
        val member = TestFixtures.user(id = 2L, name = "Bob")
        val project = TestFixtures.project(id = 10L).apply { members.add(member) }
        every { projectRepository.findAccessibleById(10L, 2L) } returns project

        assertThat(service.getProject(2L, 10L).id).isEqualTo(10L)
        assertThat(service.listMembers(2L, 10L).map { it.id }).containsExactlyInAnyOrder(1L, 2L)
        assertThrows<ForbiddenException> { service.addMember(2L, 10L, 3L) }
        assertThrows<ForbiddenException> { service.removeMember(2L, 10L, 1L) }
    }

    @Test
    fun `the owner can't be removed`() {
        every { projectRepository.findAccessibleById(10L, 1L) } returns TestFixtures.project(id = 10L)

        assertThrows<BadRequestException> { service.removeMember(1L, 10L, 1L) }
        verify(exactly = 0) { taskRepository.unassignUserInProject(any(), any(), any()) }
    }
}
