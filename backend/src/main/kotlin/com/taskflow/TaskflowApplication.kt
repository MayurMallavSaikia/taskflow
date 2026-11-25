package com.taskflow

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

// We authenticate with our own JWT filter, so the default in-memory user is not needed.
@SpringBootApplication(exclude = [UserDetailsServiceAutoConfiguration::class])
@ConfigurationPropertiesScan
class TaskflowApplication

fun main(args: Array<String>) {
    runApplication<TaskflowApplication>(*args)
}
