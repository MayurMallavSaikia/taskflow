package com.taskflow.task.activity

import com.taskflow.task.Task
import com.taskflow.task.TaskStatus
import com.taskflow.user.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/**
 * Keeps a simple audit trail for a task: who created it, edited it or moved it between columns.
 * Always called from inside a TaskService transaction, so the log entry and the change are saved together.
 */
@Service
@Transactional(propagation = Propagation.MANDATORY)
class TaskActivityService(
    private val activityRepository: TaskActivityRepository,
    private val userRepository: UserRepository,
    private val clock: Clock,
) {

    fun recordCreated(task: Task, actorId: Long) {
        save(task, actorId, TaskAction.CREATED, toStatus = task.status)
    }

    fun recordUpdated(task: Task, actorId: Long) {
        save(task, actorId, TaskAction.UPDATED)
    }

    fun recordStatusChange(task: Task, actorId: Long, from: TaskStatus, to: TaskStatus) {
        if (from == to) return
        save(task, actorId, TaskAction.STATUS_CHANGED, from, to)
    }

    @Transactional(readOnly = true, propagation = Propagation.REQUIRED)
    fun listForTask(taskId: Long): List<TaskActivityResponse> =
        activityRepository.findAllByTaskIdOrderByCreatedAtDescIdDesc(taskId).map(TaskActivityResponse::from)

    private fun save(task: Task, actorId: Long, action: TaskAction, fromStatus: TaskStatus? = null, toStatus: TaskStatus? = null) {
        activityRepository.save(
            TaskActivity(
                task = task,
                actor = userRepository.getReferenceById(actorId),
                action = action,
                fromStatus = fromStatus,
                toStatus = toStatus,
                createdAt = clock.instant(),
            ),
        )
    }
}
