package com.taskflow.task.sort

import com.taskflow.task.Task
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Order
import jakarta.persistence.criteria.Root
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class CreatedAtSortStrategy : TaskSortStrategy {

    override val key = "createdAt"

    override fun orders(root: Root<Task>, cb: CriteriaBuilder, direction: Sort.Direction): List<Order> =
        listOf(cb.order(root.get<Instant>("createdAt"), direction), root.idOrder(cb))
}
