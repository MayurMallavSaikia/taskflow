package com.taskflow.task.sort

import com.taskflow.common.BadRequestException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class TaskSortStrategyResolverTest {

    private val resolver = TaskSortStrategyResolver(
        listOf(DueDateSortStrategy(), PrioritySortStrategy(), CreatedAtSortStrategy()),
    )

    @Test
    fun `resolves strategy by key`() {
        assertThat(resolver.resolve("priority")).isInstanceOf(PrioritySortStrategy::class.java)
        assertThat(resolver.resolve("dueDate")).isInstanceOf(DueDateSortStrategy::class.java)
    }

    @Test
    fun `unknown key gives a helpful error`() {
        val ex = assertThrows<BadRequestException> { resolver.resolve("title") }

        assertThat(ex.message).contains("createdAt, dueDate, priority")
    }
}
