package com.taskflow.project

import com.taskflow.security.AuthUser
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
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
}
