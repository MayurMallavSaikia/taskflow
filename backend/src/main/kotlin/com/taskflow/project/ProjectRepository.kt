package com.taskflow.project

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectRepository : JpaRepository<Project, Long> {

    @EntityGraph(attributePaths = ["owner"])
    fun findAllByOwnerIdOrderByCreatedAtDesc(ownerId: Long): List<Project>

    @EntityGraph(attributePaths = ["owner"])
    fun findByIdAndOwnerId(id: Long, ownerId: Long): Project?
}
