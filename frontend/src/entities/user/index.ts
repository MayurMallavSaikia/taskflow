// Public API of the user entity. Other layers import from "@/entities/user" only.
export type { User } from "./model/types";
export { fetchUsers, selectAllUsers, usersSlice, type UsersState } from "./model/usersSlice";
