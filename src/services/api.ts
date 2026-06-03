import apiClient from "@/lib/axios";

export const api = {
  get: <T>(url: string, config = {}) => apiClient.get<T>(url, config).then(res => res.data),
  post: <T>(url: string, data?: any, config = {}) => apiClient.post<T>(url, data, config).then(res => res.data),
  put: <T>(url: string, data?: any, config = {}) => apiClient.put<T>(url, data, config).then(res => res.data),
  delete: <T>(url: string, config = {}) => apiClient.delete<T>(url, config).then(res => res.data),
};
export default api;
