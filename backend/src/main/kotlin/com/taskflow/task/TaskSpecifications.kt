package com.taskflow.task

import com.taskflow.task.sort.TaskSortStrategy
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification

data class TaskFilter(
    val status: TaskStatus? = null,
    val priority: TaskPriority? = null,
    val assigneeId: Long? = null,
    /** Free-text search: matches the title, or the task id when it's a number like "42" or "#42". */
    val search: String? = null,
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
            filter.search?.trim()?.takeIf { it.isNotEmpty() }?.let(::matchesSearch),
        ).reduce { acc, spec -> acc.and(spec) }

    /**
     * Case-insensitive "title contains". If the term is a number (optionally prefixed with '#'),
     * the task with that id matches too, so "42" finds task #42 as well as "Release 42".
     */
    fun matchesSearch(term: String) = Specification<Task> { root, _, cb ->
        val titleMatches = cb.like(cb.lower(root.get("title")), "%${escapeLike(term.lowercase())}%", LIKE_ESCAPE)
        val id = term.removePrefix("#").trim().toLongOrNull()
        if (id == null) titleMatches else cb.or(titleMatches, cb.equal(root.get<Long>("id"), id))
    }

    /** Treat % and _ typed by the user as literal characters, not wildcards. */
    private fun escapeLike(value: String) =
        value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    private const val LIKE_ESCAPE = '\\'

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
