package com.taskflow.project

import com.taskflow.common.NotFoundException
import com.taskflow.user.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

@Service
@Transactional(readOnly = true)
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
    private val clock: Clock,
) {

    fun listProjects(userId: Long): List<ProjectResponse> =
        projectRepository.findAllByOwnerIdOrderByCreatedAtDesc(userId).map(ProjectResponse::from)

    fun getProject(userId: Long, projectId: Long): ProjectResponse =
        ProjectResponse.from(getOwnedProject(userId, projectId))

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

    /**
     * Loads a project only if the user owns it. Returns 404 (not 403) for other users' projects
     * so we don't reveal which project ids exist.
     */
    fun getOwnedProject(userId: Long, projectId: Long): Project =
        projectRepository.findByIdAndOwnerId(projectId, userId)
            ?: throw NotFoundException("Project $projectId not found")
}
