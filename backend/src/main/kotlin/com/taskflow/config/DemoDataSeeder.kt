package com.taskflow.config

import com.taskflow.project.Project
import com.taskflow.project.ProjectRepository
import com.taskflow.task.Task
import com.taskflow.task.TaskPriority
import com.taskflow.task.TaskRepository
import com.taskflow.task.TaskStatus
import com.taskflow.user.User
import com.taskflow.user.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/**
 * Creates a demo account with a sample project so reviewers can log in straight away.
 * Runs only when taskflow.seed.enabled=true and skips if the demo user already exists.
 */
@Component
@ConditionalOnProperty(name = ["taskflow.seed.enabled"], havingValue = "true")
class DemoDataSeeder(
    private val userRepository: UserRepository,
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val passwordEncoder: PasswordEncoder,
    private val clock: Clock,
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    override fun run(args: ApplicationArguments) {
        if (userRepository.existsByEmail(DEMO_EMAIL)) return

        val demo = userRepository.save(User("Demo User", DEMO_EMAIL, passwordEncoder.encode(DEMO_PASSWORD), clock.instant()))
        val teammate = userRepository.save(
            User("Alex Teammate", "alex@taskflow.dev", passwordEncoder.encode(DEMO_PASSWORD), clock.instant()),
        )

        val project = projectRepository.save(
            Project("Website Relaunch", "Redesign and relaunch the marketing website", demo, clock.instant()),
        )
        projectRepository.save(Project("Mobile App MVP", "First version of the companion app", demo, clock.instant()))

        val today = LocalDate.now(clock)
        listOf(
            seedTask(project, "Write homepage copy", TaskStatus.TODO, TaskPriority.HIGH, today.plusDays(3), demo),
            seedTask(project, "Pick a colour palette", TaskStatus.TODO, TaskPriority.LOW, null, teammate),
            seedTask(project, "Set up analytics", TaskStatus.TODO, TaskPriority.MEDIUM, today.minusDays(2), null),
            seedTask(project, "Build page templates", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, today.plusDays(7), teammate),
            seedTask(project, "Migrate blog posts", TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, today.minusDays(1), demo),
            seedTask(project, "Agree on sitemap", TaskStatus.DONE, TaskPriority.MEDIUM, today.minusDays(5), demo),
        ).forEach(taskRepository::save)

        log.info("Seeded demo data. Log in with {} / {}", DEMO_EMAIL, DEMO_PASSWORD)
    }

    private fun seedTask(
        project: Project,
        title: String,
        status: TaskStatus,
        priority: TaskPriority,
        dueDate: LocalDate?,
        assignee: User?,
    ): Task {
        val now = clock.instant()
        return Task(
            title = title,
            description = null,
            status = status,
            priority = priority,
            dueDate = dueDate,
            assignee = assignee,
            project = project,
            createdAt = now,
            updatedAt = now,
        )
    }

    companion object {
        // Demo-only credentials for local review, not a secret.
        const val DEMO_EMAIL = "demo@taskflow.dev"
        const val DEMO_PASSWORD = "Password123!"
    }
}
