import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../api/usersApi";
import { queryKeys } from "./queryKeys";

export function useUsers() {
  // Users rarely change while the board is open.
  return useQuery({ queryKey: queryKeys.users, queryFn: usersApi.list, staleTime: 5 * 60 * 1000 });
}
