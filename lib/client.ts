/** 브라우저에서 같은 앱의 /api 를 부른다. 별도 도메인이 아니라 CORS 가 없다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: Record<string, unknown>,
  ) {
    super(code);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, String(body?.error ?? res.status), body ?? {});
  }
  return body as T;
}

export function inviteUrl(token: string) {
  return `${window.location.origin}/t/${token}`;
}

/** 클립보드 복사. https 또는 localhost 가 아니면 실패할 수 있어 결과를 돌려준다. */
export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
