-- Users who belong to a project. Only members can be assigned the project's tasks.
CREATE TABLE project_members (
    project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members (user_id);

-- Backfill: every owner is a member of their project...
INSERT INTO project_members (project_id, user_id)
SELECT id, owner_id FROM projects;

-- ...and so is anyone already assigned a task in it, so existing assignments stay valid.
INSERT INTO project_members (project_id, user_id)
SELECT DISTINCT t.project_id, t.assignee_id
FROM tasks t
JOIN projects p ON p.id = t.project_id
WHERE t.assignee_id IS NOT NULL
  AND t.assignee_id <> p.owner_id;

