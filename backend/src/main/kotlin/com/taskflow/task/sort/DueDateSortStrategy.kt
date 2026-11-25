package com.taskflow.task.sort

import com.taskflow.task.Task
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Order
import jakarta.persistence.criteria.Root
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Component
import java.time.LocalDate

/**
 * Sorts by due date. Tasks without a due date always go last (H2 and PostgreSQL disagree on
 * default null ordering, so we make it explicit).
 */
@Component
class DueDateSortStrategy : TaskSortStrategy {

    override val key = "dueDate"

    override fun orders(root: Root<Task>, cb: CriteriaBuilder, direction: Sort.Direction): List<Order> {
        val dueDate = root.get<LocalDate>("dueDate")
        val nullsLast = cb.selectCase<Int>()
            .`when`(cb.isNull(dueDate), cb.literal(1))
            .otherwise(cb.literal(0))
        return listOf(cb.asc(nullsLast), cb.order(dueDate, direction), root.idOrder(cb))
    }
}
