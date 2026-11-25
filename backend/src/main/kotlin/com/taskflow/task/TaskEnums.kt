package com.taskflow.task

enum class TaskStatus { TODO, IN_PROGRESS, DONE }

/**
 * [rank] is used for sorting by priority, since sorting the stored string would be alphabetical.
 */
enum class TaskPriority(val rank: Int) {
    LOW(1),
    MEDIUM(2),
    HIGH(3),
}
