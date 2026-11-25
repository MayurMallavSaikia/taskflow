package com.taskflow.task.sort

import com.taskflow.task.Task
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Order
import jakarta.persistence.criteria.Root
import org.springframework.data.domain.Sort

/**
 * Strategy pattern: each way of sorting tasks is its own class, picked at runtime by
 * [TaskSortStrategyResolver] from the `sort` query param. Adding a new sort option means adding
 * one new @Component - nothing else changes.
 */
interface TaskSortStrategy {

    /** Value of the `sort` query parameter that selects this strategy. */
    val key: String

    fun orders(root: Root<Task>, cb: CriteriaBuilder, direction: Sort.Direction): List<Order>
}

internal fun CriteriaBuilder.order(expression: Expression<*>, direction: Sort.Direction): Order =
    if (direction.isAscending) asc(expression) else desc(expression)

/** Tie-breaker so paging is stable when the main sort value is equal. */
internal fun Root<Task>.idOrder(cb: CriteriaBuilder): Order = cb.asc(get<Long>("id"))
