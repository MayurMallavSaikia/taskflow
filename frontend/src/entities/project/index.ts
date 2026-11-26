// Public API of the project entity. Other layers import from "@/entities/project" only.
export type { Project, ProjectPayload, ProjectSummary } from "./model/types";
export {
  addProjectMember,
  createProject,
  fetchProject,
  fetchProjectMembers,
  fetchProjects,
  fetchProjectSummary,
  projectsSlice,
  removeProjectMember,
  selectProjectById,
  selectProjectDetailState,
  selectProjectList,
  selectProjectListState,
  selectProjectMembers,
  selectProjectSummary,
  type ProjectsState,
} from "./model/projectsSlice";
