package com.taskflow.task

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import java.time.LocalDate

data class StatusCount(val status: TaskStatus, val count: Long)

interface TaskRepository : JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    // Load the assignee in the same query to avoid N+1 when mapping the page to DTOs.
    @EntityGraph(attributePaths = ["assignee"])
    override fun findAll(spec: Specification<Task>?, pageable: Pageable): Page<Task>

    @EntityGraph(attributePaths = ["assignee", "project"])
    fun findByIdAndProjectOwnerId(id: Long, ownerId: Long): Task?

    @Query(
        """
        select new com.taskflow.task.StatusCount(t.status, count(t))
        from Task t
        where t.project.id = :projectId
        group by t.status
        """,
    )
    fun countByStatus(projectId: Long): List<StatusCount>

    fun countByProjectIdAndStatusNotAndDueDateBefore(projectId: Long, status: TaskStatus, date: LocalDate): Long
}
