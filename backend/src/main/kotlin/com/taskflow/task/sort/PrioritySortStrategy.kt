package com.taskflow.task.sort

import com.taskflow.task.Task
import com.taskflow.task.TaskPriority
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Order
import jakarta.persistence.criteria.Root
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Component

/**
 * Sorts by priority rank (LOW < MEDIUM < HIGH) rather than the stored string value.
 */
@Component
class PrioritySortStrategy : TaskSortStrategy {

    override val key = "priority"

    override fun orders(root: Root<Task>, cb: CriteriaBuilder, direction: Sort.Direction): List<Order> {
        val priority = root.get<TaskPriority>("priority")
        var rank = cb.selectCase<Int>()
        TaskPriority.entries.forEach { rank = rank.`when`(cb.equal(priority, it), cb.literal(it.rank)) }
        return listOf(cb.order(rank.otherwise(cb.literal(0)), direction), root.idOrder(cb))
    }
}
