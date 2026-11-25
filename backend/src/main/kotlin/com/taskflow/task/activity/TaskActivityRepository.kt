package com.taskflow.task.activity

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface TaskActivityRepository : JpaRepository<TaskActivity, Long> {

    @EntityGraph(attributePaths = ["actor"])
    fun findAllByTaskIdOrderByCreatedAtDescIdDesc(taskId: Long): List<TaskActivity>
}
