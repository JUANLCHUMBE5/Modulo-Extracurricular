const API_BASE_URL = String(
  import.meta.env?.VITE_API_URL ||
  (import.meta.env?.DEV ? import.meta.env?.VITE_LOCAL_API_URL : "") ||
  ""
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(path, options = {}) {
  const { body, headers, ...requestOptions } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(headers || {}),
    },
    body: isFormData || body == null ? body : JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    throw new ApiError(data?.message || "No se pudo completar la solicitud.", {
      status: response.status,
      data,
    });
  }

  return data;
}

export const apiClient = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};

export const localDbApi = {
  getDatabase: () => apiClient.get("/api/db"),
  saveDatabase: (data) => apiClient.put("/api/db", data),
  resetDatabase: () => apiClient.post("/api/db/reset"),
};
