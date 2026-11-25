package com.taskflow.project

import com.taskflow.TestFixtures
import com.taskflow.common.NotFoundException
import com.taskflow.user.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.util.Optional

class ProjectServiceTest {

    private val projectRepository = mockk<ProjectRepository>()
    private val userRepository = mockk<UserRepository>()
    private val service = ProjectService(projectRepository, userRepository, TestFixtures.fixedClock)

    @Test
    fun `lists only the user's projects`() {
        val owner = TestFixtures.user(id = 1L)
        every { projectRepository.findAllByOwnerIdOrderByCreatedAtDesc(1L) } returns listOf(
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
        every { projectRepository.findByIdAndOwnerId(10L, 2L) } returns null

        assertThrows<NotFoundException> { service.getOwnedProject(2L, 10L) }
    }
}
