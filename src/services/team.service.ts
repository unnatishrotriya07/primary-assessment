import api from "./api";

export interface TeamUser {
  id: number;
  name: string;
  email: string;
  role: string;
  allowedFeatures: string[];
  tenantId?: string;
}

export const teamService = {
  getAll: (): Promise<TeamUser[]> => {
    return api.get<TeamUser[]>("/team");
  },
  create: (data: Omit<TeamUser, "id"> & { password?: string }): Promise<TeamUser> => {
    return api.post<TeamUser>("/team", data);
  },
  update: (id: number, data: Partial<TeamUser> & { password?: string }): Promise<TeamUser> => {
    return api.put<TeamUser>(`/team/${id}`, data);
  },
  delete: (id: number): Promise<void> => {
    return api.delete<void>(`/team/${id}`);
  },
};

export default teamService;
