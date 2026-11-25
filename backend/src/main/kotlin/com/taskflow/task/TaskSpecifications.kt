package com.taskflow.task

import com.taskflow.task.sort.TaskSortStrategy
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification

data class TaskFilter(
    val status: TaskStatus? = null,
    val priority: TaskPriority? = null,
    val assigneeId: Long? = null,
)

/**
 * Small composable query pieces for the task list endpoint. Each optional filter returns null
 * when it's not set, so the caller can just combine the non-null ones.
 */
object TaskSpecifications {

    fun forProject(projectId: Long, filter: TaskFilter): Specification<Task> =
        listOfNotNull(
            inProject(projectId),
            filter.status?.let(::hasStatus),
            filter.priority?.let(::hasPriority),
            filter.assigneeId?.let(::hasAssignee),
        ).reduce { acc, spec -> acc.and(spec) }

    fun inProject(projectId: Long) = Specification<Task> { root, _, cb ->
        cb.equal(root.get<Any>("project").get<Long>("id"), projectId)
    }

    fun hasStatus(status: TaskStatus) = Specification<Task> { root, _, cb ->
        cb.equal(root.get<TaskStatus>("status"), status)
    }

    fun hasPriority(priority: TaskPriority) = Specification<Task> { root, _, cb ->
        cb.equal(root.get<TaskPriority>("priority"), priority)
    }

    fun hasAssignee(assigneeId: Long) = Specification<Task> { root, _, cb ->
        cb.equal(root.get<Any>("assignee").get<Long>("id"), assigneeId)
    }

    /**
     * Applies the ordering from a sort strategy. Spring Data only overrides the ORDER BY when the
     * Pageable is sorted, so we pass an unsorted Pageable and let this spec own the ordering.
     * Skipped for the count query Spring runs for pagination.
     */
    fun orderedBy(strategy: TaskSortStrategy, direction: Sort.Direction) = Specification<Task> { root, query, cb ->
        if (query != null && query.resultType != Long::class.javaObjectType) {
            query.orderBy(strategy.orders(root, cb, direction))
        }
        cb.conjunction()
    }
}
