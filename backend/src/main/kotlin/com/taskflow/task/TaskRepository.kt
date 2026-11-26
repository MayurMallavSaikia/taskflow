package com.taskflow.task

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.time.LocalDate

data class StatusCount(val status: TaskStatus, val count: Long)

interface TaskRepository : JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    // Load the assignee in the same query to avoid N+1 when mapping the page to DTOs.
    @EntityGraph(attributePaths = ["assignee"])
    override fun findAll(spec: Specification<Task>?, pageable: Pageable): Page<Task>

    /** The task, if the user owns its project or is a member of it. */
    @EntityGraph(attributePaths = ["assignee", "project"])
    @Query(
        """
        select t from Task t
        where t.id = :id
          and (t.project.owner.id = :userId
               or exists (select 1 from Project pm join pm.members m where pm.id = t.project.id and m.id = :userId))
        """,
    )
    fun findAccessibleById(id: Long, userId: Long): Task?

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

    /** Unassigns a user from every task in a project, e.g. when they are removed from it. Returns the count. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(
        """
        update Task t set t.assignee = null, t.updatedAt = :now
        where t.project.id = :projectId and t.assignee.id = :userId
        """,
    )
    fun unassignUserInProject(projectId: Long, userId: Long, now: Instant): Int
}
