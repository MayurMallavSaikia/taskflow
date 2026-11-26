package com.taskflow

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.taskflow.config.DemoDataSeeder
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
import org.springframework.test.web.servlet.put
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

    @Test
    fun `guest login signs in as the demo account once it exists`() {
        // Seeding is off in tests, so there is no demo account yet.
        mockMvc.post("/api/auth/guest").andExpect { status { isNotFound() } }

        mockMvc.post("/api/auth/register") {
            json("""{"name":"Demo User","email":"${DemoDataSeeder.DEMO_EMAIL}","password":"${DemoDataSeeder.DEMO_PASSWORD}"}""")
        }.andExpect { status { isCreated() } }

        val guestToken = mockMvc.post("/api/auth/guest").andExpect {
            status { isOk() }
            jsonPath("$.user.email") { value(DemoDataSeeder.DEMO_EMAIL) }
        }.body().path("token").asText()

        mockMvc.get("/api/projects") { bearer(guestToken) }.andExpect { status { isOk() } }
    }

    @Test
    fun `only project members can be assigned tasks`() {
        val projectId = createProject(token, "Team work").path("id").asLong()
        val ownerId = mockMvc.get("/api/projects/$projectId") { bearer(token) }.body().path("owner").path("id").asLong()
        val teammateId = registerAndGetUserId("teammate")

        // The owner starts as the only member.
        mockMvc.get("/api/projects/$projectId/members") { bearer(token) }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].id") { value(ownerId) }
        }

        // A non-member can't be assigned.
        mockMvc.post("/api/projects/$projectId/tasks") {
            bearer(token)
            json("""{"title":"Pair up","assigneeId":$teammateId}""")
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.fieldErrors[0].field") { value("assigneeId") }
            jsonPath("$.fieldErrors[0].message") { value("Assignee must be a member of this project") }
        }

        // After adding them (twice: it's idempotent) they can.
        mockMvc.put("/api/projects/$projectId/members/$teammateId") { bearer(token) }.andExpect { status { isOk() } }
        mockMvc.put("/api/projects/$projectId/members/$teammateId") { bearer(token) }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(2) }
        }
        val taskId = createTask(projectId, """{"title":"Pair up","assigneeId":$teammateId}""").path("id").asLong()

        // The owner can't be removed; removing the teammate unassigns their tasks.
        mockMvc.delete("/api/projects/$projectId/members/$ownerId") { bearer(token) }.andExpect { status { isBadRequest() } }
        mockMvc.delete("/api/projects/$projectId/members/$teammateId") { bearer(token) }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
        }
        val task = mockMvc.get("/api/projects/$projectId/tasks") { bearer(token) }.body()
            .path("content").first { it.path("id").asLong() == taskId }
        assertThat(task.path("assignee").isNull).isTrue()

        // Other users can't see or change the member list.
        val outsider = register("outsider")
        mockMvc.get("/api/projects/$projectId/members") { bearer(outsider) }.andExpect { status { isNotFound() } }
        mockMvc.put("/api/projects/$projectId/members/$teammateId") { bearer(outsider) }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `tasks can be searched by title or id and fetched individually`() {
        val projectId = createProject(token, "Searchable").path("id").asLong()
        val release = createTask(projectId, """{"title":"Prepare Release notes"}""").path("id").asLong()
        val bugfix = createTask(projectId, """{"title":"Fix 100% CPU bug"}""").path("id").asLong()
        val otherProjectTask = createTask(createProject(token, "Other").path("id").asLong(), """{"title":"Release party"}""")

        fun search(q: String): List<Long> =
            mockMvc.get("/api/projects/$projectId/tasks") {
                bearer(token)
                param("q", q)
            }.andExpect { status { isOk() } }.body().path("content").map { it.path("id").asLong() }

        assertThat(search("release")).containsExactly(release) // case-insensitive, scoped to the project
        assertThat(search("$bugfix")).containsExactly(bugfix) // by id
        assertThat(search("#$release")).containsExactly(release) // "#id" works too
        assertThat(search("100%")).containsExactly(bugfix) // % is literal, not a wildcard
        assertThat(search("nothing like this")).isEmpty()
        assertThat(search("   ")).containsExactlyInAnyOrder(release, bugfix) // blank = no filter

        mockMvc.get("/api/tasks/$release") { bearer(token) }.andExpect {
            status { isOk() }
            jsonPath("$.title") { value("Prepare Release notes") }
            jsonPath("$.projectId") { value(projectId) }
        }
        mockMvc.get("/api/tasks/${otherProjectTask.path("id").asLong()}") { bearer(register("stranger")) }
            .andExpect { status { isNotFound() } }
    }

    @Test
    fun `added members see the project on their dashboard and can work on its tasks`() {
        val projectId = createProject(token, "Shared board").path("id").asLong()
        val ownerTaskId = createTask(projectId, """{"title":"Owner's task"}""").path("id").asLong()
        val (memberToken, memberId) = registerWithToken("member")

        // Not a member yet: invisible.
        mockMvc.get("/api/projects") { bearer(memberToken) }.andExpect { jsonPath("$.length()") { value(0) } }
        mockMvc.get("/api/projects/$projectId") { bearer(memberToken) }.andExpect { status { isNotFound() } }

        mockMvc.put("/api/projects/$projectId/members/$memberId") { bearer(token) }.andExpect { status { isOk() } }

        // Now it's on their dashboard and they can use the board.
        mockMvc.get("/api/projects") { bearer(memberToken) }.andExpect {
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].id") { value(projectId) }
            jsonPath("$[0].owner.name") { value("owner") }
        }
        mockMvc.get("/api/projects/$projectId/tasks") { bearer(memberToken) }.andExpect {
            status { isOk() }
            jsonPath("$.totalElements") { value(1) }
        }
        mockMvc.get("/api/tasks/$ownerTaskId") { bearer(memberToken) }.andExpect { status { isOk() } }
        mockMvc.get("/api/projects/$projectId/summary") { bearer(memberToken) }.andExpect { status { isOk() } }
        mockMvc.get("/api/projects/$projectId/members") { bearer(memberToken) }.andExpect { jsonPath("$.length()") { value(2) } }
        mockMvc.post("/api/projects/$projectId/tasks") {
            bearer(memberToken)
            json("""{"title":"Member's task","assigneeId":$memberId}""")
        }.andExpect { status { isCreated() } }
        mockMvc.patch("/api/tasks/$ownerTaskId/status") {
            bearer(memberToken)
            json("""{"status":"DONE"}""")
        }.andExpect { status { isOk() } }

        // ...but only the owner manages members.
        val outsiderId = registerWithToken("outsider").second
        mockMvc.put("/api/projects/$projectId/members/$outsiderId") { bearer(memberToken) }.andExpect {
            status { isForbidden() }
            jsonPath("$.message") { value("Only the project owner can manage members") }
        }

        // Removed again: gone from their dashboard, and no access.
        mockMvc.delete("/api/projects/$projectId/members/$memberId") { bearer(token) }.andExpect { status { isOk() } }
        mockMvc.get("/api/projects") { bearer(memberToken) }.andExpect { jsonPath("$.length()") { value(0) } }
        mockMvc.get("/api/tasks/$ownerTaskId") { bearer(memberToken) }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `board returns every column in one call, filtered and limited per column`() {
        val projectId = createProject(token, "Board").path("id").asLong()
        repeat(3) { createTask(projectId, """{"title":"Spec $it","priority":"HIGH"}""") }
        createTask(projectId, """{"title":"Other"}""")
        val doing = createTask(projectId, """{"title":"Spec doing"}""").path("id").asLong()
        mockMvc.patch("/api/tasks/$doing/status") {
            bearer(token)
            json("""{"status":"IN_PROGRESS"}""")
        }.andExpect { status { isOk() } }

        mockMvc.get("/api/projects/$projectId/board?q=spec&todoLimit=2&sort=createdAt") { bearer(token) }.andExpect {
            status { isOk() }
            // TODO: 3 match "spec", only 2 returned; "Other" is filtered out.
            jsonPath("$.columns.TODO.total") { value(3) }
            jsonPath("$.columns.TODO.tasks.length()") { value(2) }
            jsonPath("$.columns.TODO.tasks[0].title") { value("Spec 0") }
            jsonPath("$.columns.IN_PROGRESS.total") { value(1) }
            jsonPath("$.columns.IN_PROGRESS.tasks[0].id") { value(doing) }
            // Empty columns are still present.
            jsonPath("$.columns.DONE.total") { value(0) }
            jsonPath("$.columns.DONE.tasks.length()") { value(0) }
        }

        mockMvc.get("/api/projects/$projectId/board") { bearer(register("nosy")) }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `an unknown endpoint is a 404, not a 500`() {
        mockMvc.get("/api/does-not-exist") { bearer(token) }.andExpect {
            status { isNotFound() }
            jsonPath("$.message") { value("No endpoint GET /api/does-not-exist") }
        }
    }

    /** Registers a user and returns (token, userId). */
    private fun registerWithToken(prefix: String): Pair<String, Long> {
        val body = mockMvc.post("/api/auth/register") {
            json("""{"name":"$prefix","email":"$prefix-${UUID.randomUUID()}@example.com","password":"Password1!"}""")
        }.andExpect { status { isCreated() } }.body()
        return body.path("token").asText() to body.path("user").path("id").asLong()
    }

    private fun registerAndGetUserId(prefix: String): Long =
        mockMvc.post("/api/auth/register") {
            json("""{"name":"$prefix","email":"$prefix-${UUID.randomUUID()}@example.com","password":"Password1!"}""")
        }.andExpect { status { isCreated() } }.body().path("user").path("id").asLong()

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
