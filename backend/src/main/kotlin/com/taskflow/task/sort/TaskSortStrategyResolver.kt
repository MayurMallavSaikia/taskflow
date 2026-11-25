package com.taskflow.task.sort

import com.taskflow.common.BadRequestException
import org.springframework.stereotype.Component

@Component
class TaskSortStrategyResolver(strategies: List<TaskSortStrategy>) {

    private val strategiesByKey = strategies.associateBy { it.key }

    fun resolve(key: String): TaskSortStrategy =
        strategiesByKey[key]
            ?: throw BadRequestException("Unsupported sort '$key'. Allowed values: ${supportedKeys().joinToString()}")

    fun supportedKeys(): List<String> = strategiesByKey.keys.sorted()
}
