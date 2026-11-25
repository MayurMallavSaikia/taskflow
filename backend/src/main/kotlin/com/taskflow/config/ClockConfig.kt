package com.taskflow.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

@Configuration
class ClockConfig {

    // Injecting a Clock makes "today" / "now" easy to control in tests.
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
