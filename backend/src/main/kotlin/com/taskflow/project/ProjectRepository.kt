package com.taskflow.project

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface ProjectRepository : JpaRepository<Project, Long> {

    /** Projects the user owns or is a member of, newest first. */
    @EntityGraph(attributePaths = ["owner"])
    @Query(
        """
        select p from Project p
        where p.owner.id = :userId
           or exists (select 1 from Project pm join pm.members m where pm.id = p.id and m.id = :userId)
        order by p.createdAt desc
        """,
    )
    fun findAllAccessibleBy(userId: Long): List<Project>

    /** The project, if the user owns it or is a member of it. */
    @EntityGraph(attributePaths = ["owner"])
    @Query(
        """
        select p from Project p
        where p.id = :id
          and (p.owner.id = :userId
               or exists (select 1 from Project pm join pm.members m where pm.id = p.id and m.id = :userId))
        """,
    )
    fun findAccessibleById(id: Long, userId: Long): Project?
}
