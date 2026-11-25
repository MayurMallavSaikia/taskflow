package com.taskflow.task

import com.taskflow.TestFixtures
import com.taskflow.TestFixtures.TODAY
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class TaskTest {

    @Test
    fun `task is overdue only when due date has passed and it is not done`() {
        assertThat(TestFixtures.task(dueDate = TODAY.minusDays(1)).isOverdue(TODAY)).isTrue()
        assertThat(TestFixtures.task(dueDate = TODAY).isOverdue(TODAY)).isFalse()
        assertThat(TestFixtures.task(dueDate = null).isOverdue(TODAY)).isFalse()
        assertThat(TestFixtures.task(dueDate = TODAY.minusDays(1), status = TaskStatus.DONE).isOverdue(TODAY)).isFalse()
    }
}
