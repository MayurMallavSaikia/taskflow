package com.taskflow.task.activity

import com.taskflow.task.TaskStatus
import com.taskflow.user.UserResponse
import java.time.Instant

data class TaskActivityResponse(
    val id: Long,
    val action: TaskAction,
    val fromStatus: TaskStatus?,
    val toStatus: TaskStatus?,
    val actor: UserResponse,
    val createdAt: Instant,
) {
    companion object {
        fun from(activity: TaskActivity) = TaskActivityResponse(
            id = requireNotNull(activity.id),
            action = activity.action,
            fromStatus = activity.fromStatus,
            toStatus = activity.toStatus,
            actor = UserResponse.from(activity.actor),
            createdAt = activity.createdAt,
        )
    }
}
