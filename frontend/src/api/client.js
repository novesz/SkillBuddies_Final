/**
 * One place for all API calls – same base URL and credentials.
 */
import axios from "axios";
import { API_BASE } from "../config.js";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403) {
      api.post("/logout").catch(() => {}).finally(() => {
        window.dispatchEvent(new CustomEvent("auth:logout"));
      });
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_BASE };
