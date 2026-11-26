package com.taskflow.project

import com.taskflow.security.AuthUser
import com.taskflow.user.UserResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/projects")
class ProjectController(private val projectService: ProjectService) {

    @GetMapping
    fun listProjects(@AuthenticationPrincipal user: AuthUser): List<ProjectResponse> =
        projectService.listProjects(user.id)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createProject(
        @AuthenticationPrincipal user: AuthUser,
        @Valid @RequestBody request: CreateProjectRequest,
    ): ProjectResponse = projectService.createProject(user.id, request)

    @GetMapping("/{projectId}")
    fun getProject(@AuthenticationPrincipal user: AuthUser, @PathVariable projectId: Long): ProjectResponse =
        projectService.getProject(user.id, projectId)

    /** Users who can be assigned tasks in this project (the owner is always included). */
    @GetMapping("/{projectId}/members")
    fun listMembers(@AuthenticationPrincipal user: AuthUser, @PathVariable projectId: Long): List<UserResponse> =
        projectService.listMembers(user.id, projectId)

    /** Adds a member. Idempotent; returns the updated member list. */
    @PutMapping("/{projectId}/members/{userId}")
    fun addMember(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable projectId: Long,
        @PathVariable userId: Long,
    ): List<UserResponse> = projectService.addMember(user.id, projectId, userId)

    /** Removes a member and unassigns their tasks in this project; returns the updated member list. */
    @DeleteMapping("/{projectId}/members/{userId}")
    fun removeMember(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable projectId: Long,
        @PathVariable userId: Long,
    ): List<UserResponse> = projectService.removeMember(user.id, projectId, userId)
}
