package com.taskflow.project

import com.taskflow.common.BadRequestException
import com.taskflow.common.ForbiddenException
import com.taskflow.common.NotFoundException
import com.taskflow.task.TaskRepository
import com.taskflow.user.UserRepository
import com.taskflow.user.UserResponse
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

@Service
@Transactional(readOnly = true)
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
    private val taskRepository: TaskRepository,
    private val clock: Clock,
) {

    /** Projects the user owns plus projects they've been added to as a member. */
    fun listProjects(userId: Long): List<ProjectResponse> =
        projectRepository.findAllAccessibleBy(userId).map(ProjectResponse::from)

    fun getProject(userId: Long, projectId: Long): ProjectResponse =
        ProjectResponse.from(getAccessibleProject(userId, projectId))

    @Transactional
    fun createProject(userId: Long, request: CreateProjectRequest): ProjectResponse {
        val owner = userRepository.findById(userId).orElseThrow { NotFoundException("User not found") }
        val project = projectRepository.save(
            Project(
                name = request.name.trim(),
                description = request.description?.trim()?.ifBlank { null },
                owner = owner,
                createdAt = clock.instant(),
            ),
        )
        return ProjectResponse.from(project)
    }

    /** Any member can see who else is on the project (it's also the assignee list). */
    fun listMembers(userId: Long, projectId: Long): List<UserResponse> =
        sortedMembers(getAccessibleProject(userId, projectId))

    /** Adds a user to the project. Adding an existing member is a no-op. Owner only. */
    @Transactional
    fun addMember(userId: Long, projectId: Long, memberId: Long): List<UserResponse> {
        val project = getOwnedProject(userId, projectId)
        if (!project.isMember(memberId)) {
            val member = userRepository.findByIdOrNull(memberId) ?: throw NotFoundException("User $memberId not found")
            project.members.add(member)
        }
        return sortedMembers(project)
    }

    /** Removes a user from the project and unassigns them from its tasks. The owner can't be removed. Owner only. */
    @Transactional
    fun removeMember(userId: Long, projectId: Long, memberId: Long): List<UserResponse> {
        val project = getOwnedProject(userId, projectId)
        if (project.owner.id == memberId) throw BadRequestException("The project owner can't be removed")
        if (project.members.removeIf { it.id == memberId }) {
            projectRepository.saveAndFlush(project)
            taskRepository.unassignUserInProject(projectId, memberId, clock.instant())
        }
        return sortedMembers(getOwnedProject(userId, projectId))
    }

    private fun sortedMembers(project: Project): List<UserResponse> =
        project.members.sortedBy { it.name.lowercase() }.map(UserResponse::from)

    /**
     * Loads a project the user owns or is a member of. Everyone else gets 404 (not 403) so we
     * don't reveal which project ids exist.
     */
    fun getAccessibleProject(userId: Long, projectId: Long): Project =
        projectRepository.findAccessibleById(projectId, userId)
            ?: throw NotFoundException("Project $projectId not found")

    /**
     * Loads a project for an owner-only action. Members get 403 (they can already see the project),
     * everyone else 404.
     */
    fun getOwnedProject(userId: Long, projectId: Long): Project {
        val project = getAccessibleProject(userId, projectId)
        if (project.owner.id != userId) throw ForbiddenException("Only the project owner can manage members")
        return project
    }
}
