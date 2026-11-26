import React, { useEffect, useState } from "react";
import { getErrorMessage } from "@/shared/api/errors";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { useAsyncAction } from "@/shared/lib/useAsyncAction";
import { Button } from "@/shared/ui/Button";
import { ErrorMessage } from "@/shared/ui/ErrorMessage";
import { FormField } from "@/shared/ui/FormField";
import { Spinner } from "@/shared/ui/Spinner";
import { addProjectMember, fetchProjectMembers, removeProjectMember, selectProjectMembers } from "@/entities/project";
import { taskDataChanged } from "@/entities/task";
import { fetchUsers, selectAllUsers, type User } from "@/entities/user";

interface ProjectMembersProps {
  projectId: number;
  owner: User;
  /** The logged-in user; only the owner can add or remove members. */
  currentUserId: number | undefined;
}

/**
 * Who belongs to a project. Members see the project on their dashboard and only they can be
 * assigned its tasks. Only the owner can add or remove members; everyone else sees a read-only list.
 */
export const ProjectMembers: React.FC<ProjectMembersProps> = ({ projectId, owner, currentUserId }) => {
  const dispatch = useAppDispatch();
  const canManage = currentUserId === owner.id;
  const members = useAppSelector(selectProjectMembers(projectId));
  const users = useAppSelector(selectAllUsers);
  const [selectedUserId, setSelectedUserId] = useState("");

  const add = useAsyncAction((userId: number) => dispatch(addProjectMember({ projectId, userId })).unwrap());
  const remove = useAsyncAction(async (userId: number) => {
    await dispatch(removeProjectMember({ projectId, userId })).unwrap();
    // Their tasks in this project were unassigned on the server: refresh the board.
    dispatch(taskDataChanged(projectId));
  });

  useEffect(() => {
    dispatch(fetchProjectMembers(projectId));
  }, [dispatch, projectId]);

  useEffect(() => {
    if (canManage) dispatch(fetchUsers());
  }, [dispatch, canManage]);

  if (!members.data) {
    if (members.status === "failed") {
      return <ErrorMessage error={members.error} onRetry={() => dispatch(fetchProjectMembers(projectId))} />;
    }
    return <Spinner label="Loading members…" />;
  }

  const memberIds = new Set(members.data.map((m) => m.id));
  const candidates = (users.data ?? []).filter((u) => !memberIds.has(u.id));
  const actionError = add.error ?? remove.error;
  const usersLoading = users.status === "loading" && !users.data;

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUserId) return;
    remove.reset();
    if ((await add.run(Number(selectedUserId))).ok) setSelectedUserId("");
  };

  const handleRemove = (member: User) => {
    const confirmed = window.confirm(
      `Remove ${member.name} from this project? Their tasks in this project will be unassigned.`,
    );
    if (!confirmed) return;
    add.reset();
    void remove.run(member.id);
  };

  return (
    <div className="members">
      <p className="muted small">
        Members see this project on their dashboard, and only they can be assigned its tasks.
        {!canManage && ` Only the owner (${owner.name}) can add or remove members.`}
      </p>

      {actionError && (
        <div className="alert alert-error" role="alert">
          {getErrorMessage(actionError)}
        </div>
      )}

      <ul className="member-list" aria-label="Project members">
        {members.data.map((member) => (
          <li key={member.id} className="member-row">
            <div>
              <strong>{member.name}</strong>
              {member.id === owner.id && <span className="badge member-owner-badge">Owner</span>}
              {member.id === currentUserId && <span className="muted small"> (you)</span>}
              <div className="muted small">{member.email}</div>
            </div>
            {canManage && member.id !== owner.id && (
              <Button
                variant="ghost"
                aria-label={`Remove ${member.name}`}
                disabled={remove.isPending}
                onClick={() => handleRemove(member)}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>

      {!canManage ? null : users.status === "failed" ? (
        <div className="alert alert-error" role="alert">
          Couldn't load users to add. {getErrorMessage(users.error)}
        </div>
      ) : (
        <form className="member-add" onSubmit={handleAdd}>
          <FormField label="Add member">
            {(props) => (
              <select
                {...props}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={usersLoading || candidates.length === 0}
              >
                <option value="">
                  {usersLoading ? "Loading users…" : candidates.length === 0 ? "Everyone is already a member" : "Choose a user"}
                </option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <Button type="submit" loading={add.isPending} disabled={!selectedUserId}>
            Add
          </Button>
        </form>
      )}
    </div>
  );
};

