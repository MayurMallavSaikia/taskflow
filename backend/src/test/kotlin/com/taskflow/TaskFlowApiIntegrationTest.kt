package com.taskflow

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.taskflow.security.JwtProperties
import com.taskflow.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

/**
 * End-to-end through the HTTP layer with a real (H2) database, Flyway migrations and Spring Security.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaskFlowApiIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var jwtProperties: JwtProperties

    private lateinit var token: String

    @BeforeEach
    fun registerUser() {
        token = register("owner")
    }

    @Test
    fun `full task flow - create, list with filters, change status, summary, activity, delete`() {
        val projectId = createProject(token, "Launch").path("id").asLong()

        val highTask = createTask(projectId, """{"title":"Ship it","priority":"HIGH","dueDate":"${LocalDate.now().plusDays(5)}"}""")
        createTask(projectId, """{"title":"Write tests","priority":"LOW"}""")
        val taskId = highTask.path("id").asLong()

        mockMvc.get("/api/projects/$projectId/tasks?priority=HIGH") { bearer(token) }
            .andExpect {
                status { isOk() }
                jsonPath("$.totalElements") { value(1) }
                jsonPath("$.content[0].title") { value("Ship it") }
            }

        mockMvc.get("/api/projects/$projectId/tasks?sort=priority&direction=desc") { bearer(token) }
            .andExpect {
                jsonPath("$.content[0].title") { value("Ship it") }
                jsonPath("$.content[1].title") { value("Write tests") }
            }

        mockMvc.patch("/api/tasks/$taskId/status") {
            bearer(token)
            json("""{"status":"IN_PROGRESS"}""")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("IN_PROGRESS") }
        }

        mockMvc.get("/api/projects/$projectId/summary") { bearer(token) }
            .andExpect {
                jsonPath("$.total") { value(2) }
                jsonPath("$.countsByStatus.TODO") { value(1) }
                jsonPath("$.countsByStatus.IN_PROGRESS") { value(1) }
                jsonPath("$.countsByStatus.DONE") { value(0) }
                jsonPath("$.overdue") { value(0) }
            }

        mockMvc.get("/api/tasks/$taskId/activity") { bearer(token) }
            .andExpect {
                jsonPath("$[0].action") { value("STATUS_CHANGED") }
                jsonPath("$[0].fromStatus") { value("TODO") }
                jsonPath("$[0].toStatus") { value("IN_PROGRESS") }
                jsonPath("$[1].action") { value("CREATED") }
            }

        mockMvc.delete("/api/tasks/$taskId") { bearer(token) }.andExpect { status { isNoContent() } }
        mockMvc.get("/api/projects/$projectId/tasks") { bearer(token) }
            .andExpect { jsonPath("$.totalElements") { value(1) } }
    }

    @Test
    fun `invalid task returns 400 with field level errors`() {
        val projectId = createProject(token, "Validation").path("id").asLong()

        mockMvc.post("/api/projects/$projectId/tasks") {
            bearer(token)
            json("""{"title":"${"x".repeat(121)}","dueDate":"2000-01-01"}""")
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("Validation failed") }
            jsonPath("$.fieldErrors[?(@.field == 'title')].message") { value("Title must be at most 120 characters") }
            jsonPath("$.fieldErrors[?(@.field == 'dueDate')].message") { value("Due date cannot be in the past") }
        }
    }

    @Test
    fun `users cannot see or change other users' projects`() {
        val projectId = createProject(token, "Private").path("id").asLong()
        val taskId = createTask(projectId, """{"title":"Secret"}""").path("id").asLong()
        val otherToken = register("intruder")

        mockMvc.get("/api/projects/$projectId/tasks") { bearer(otherToken) }.andExpect { status { isNotFound() } }
        mockMvc.delete("/api/tasks/$taskId") { bearer(otherToken) }.andExpect { status { isNotFound() } }
        mockMvc.get("/api/projects") { bearer(otherToken) }.andExpect { jsonPath("$.length()") { value(0) } }
    }

    @Test
    fun `requests without a token or with an expired token get 401`() {
        mockMvc.get("/api/projects").andExpect {
            status { isUnauthorized() }
            jsonPath("$.message") { value("Authentication is required") }
        }

        val expiredClock = Clock.fixed(Instant.parse("2020-01-01T00:00:00Z"), ZoneOffset.UTC)
        val expiredToken = JwtService(jwtProperties.copy(expiration = Duration.ofMinutes(5)), expiredClock)
            .generateToken(1L, "old@example.com").token

        mockMvc.get("/api/projects") { bearer(expiredToken) }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.message") { value("Your session has expired. Please log in again.") }
        }
    }

    @Test
    fun `registering the same email twice returns 409`() {
        val email = "dup-${UUID.randomUUID()}@example.com"
        val body = """{"name":"Dup","email":"$email","password":"Password1!"}"""
        mockMvc.post("/api/auth/register") { json(body) }.andExpect { status { isCreated() } }
        mockMvc.post("/api/auth/register") { json(body) }.andExpect { status { isConflict() } }
    }

    private fun register(prefix: String): String {
        val email = "$prefix-${UUID.randomUUID()}@example.com"
        mockMvc.post("/api/auth/register") {
            json("""{"name":"$prefix","email":"$email","password":"Password1!"}""")
        }.andExpect { status { isCreated() } }

        return mockMvc.post("/api/auth/login") {
            json("""{"email":"$email","password":"Password1!"}""")
        }.andExpect { status { isOk() } }.body().path("token").asText()
    }

    private fun createProject(token: String, name: String): JsonNode =
        mockMvc.post("/api/projects") {
            bearer(token)
            json("""{"name":"$name"}""")
        }.andExpect { status { isCreated() } }.body()

    private fun createTask(projectId: Long, body: String): JsonNode =
        mockMvc.post("/api/projects/$projectId/tasks") {
            bearer(token)
            json(body)
        }.andExpect { status { isCreated() } }.body()

    private fun ResultActionsDsl.body(): JsonNode =
        objectMapper.readTree(andReturn().response.contentAsString).also { assertThat(it).isNotNull }

    private fun org.springframework.test.web.servlet.MockHttpServletRequestDsl.bearer(token: String) {
        header("Authorization", "Bearer $token")
    }

    private fun org.springframework.test.web.servlet.MockHttpServletRequestDsl.json(body: String) {
        contentType = MediaType.APPLICATION_JSON
        content = body
    }
}
