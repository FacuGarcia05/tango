export const API = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError<T = unknown> extends Error {
  status: number;
  data: T | null;

  constructor(status: number, message: string, data: T | null = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function mergeHeaders(...inits: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();
  inits.forEach((init) => {
    if (!init) return;
    const current = new Headers(init);
    current.forEach((value, key) => headers.set(key, value));
  });
  return headers;
}

async function parseJson<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return (await res.json()) as T;
    } catch (error) {
      console.error("Failed to parse JSON response", error);
    }
  }
  return null;
}

function buildError<T>(res: Response, data: T | null): ApiError<T> {
  const message =
    (data && typeof data === "object" && "message" in data
      ? (data as { message?: string }).message
      : undefined) ?? res.statusText;

  return new ApiError(res.status, message || "Request failed", data);
}

function isServer() {
  return typeof window === "undefined";
}

function isFormData(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function getCookieHeader(): Promise<string | null> {
  if (!isServer()) {
    return null;
  }

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const cookieHeader = cookieStore?.toString() ?? "";
    return cookieHeader.length ? cookieHeader : null;
  } catch (error) {
    console.warn("Failed to read request cookies", error);
    return null;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const needsJson = init.body !== undefined && !isFormData(init.body);
  const headers = mergeHeaders(
    needsJson ? { "Content-Type": "application/json" } : undefined,
    init.headers as HeadersInit | undefined
  );

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const data = await parseJson<T>(res);

  if (!res.ok) {
    throw buildError(res, data);
  }

  return data as T;
}

export async function apiServer<T>(
  path: string,
  headersInit?: HeadersInit
): Promise<T> {
  const cookieHeader = await getCookieHeader();

  const headers = mergeHeaders(
    { "Content-Type": "application/json" },
    cookieHeader ? { cookie: cookieHeader } : undefined,
    headersInit
  );

  const res = await fetch(`${API}${path}`, {
    headers,
    cache: "no-store",
    credentials: "include",
  });

  const data = await parseJson<T>(res);

  if (!res.ok) {
    throw buildError(res, data);
  }

  return data as T;
}
