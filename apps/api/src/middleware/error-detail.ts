export interface ErrorDetail {
  code?: string;
  message?: string;
}

export function getErrorDetail(
  body: unknown,
  thrownError?: unknown
): ErrorDetail {
  if (thrownError instanceof Error) {
    return {
      code: thrownError.name || undefined,
      message: thrownError.message || undefined,
    };
  }

  if (!body || typeof body !== "object") {
    return {};
  }

  const responseBody = body as Record<string, unknown>;
  if (responseBody.error && typeof responseBody.error === "object") {
    const error = responseBody.error as Record<string, unknown>;
    return {
      code: typeof error.code === "string" ? error.code : undefined,
      message: typeof error.message === "string" ? error.message : undefined,
    };
  }

  if (typeof responseBody.message === "string") {
    return { message: responseBody.message };
  }

  if (typeof responseBody.error === "string") {
    return { message: responseBody.error };
  }

  return {};
}
