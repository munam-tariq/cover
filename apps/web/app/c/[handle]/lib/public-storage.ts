/**
 * localStorage helpers for the public hosted page.
 *
 * The visitorId is an unguessable, client-generated token that identifies this browser to
 * the API (same trust model as the embeddable widget). The sessionId (= conversation UUID)
 * is persisted per project so a refresh resumes the thread instead of dropping it.
 */

const VISITOR_KEY = "ff_public_visitor";
const SESSION_KEY_PREFIX = "ff_public_session_";
const SESSION_TOKEN_KEY_PREFIX = "ff_public_session_token_";
const LEAD_KEY_PREFIX = "ff_public_lead_";

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `pub_${Date.now()}`;
  }
}

export function getStoredSessionId(projectId: string): string | null {
  try {
    return localStorage.getItem(`${SESSION_KEY_PREFIX}${projectId}`);
  } catch {
    return null;
  }
}

export function storeSessionId(projectId: string, sessionId: string): void {
  try {
    localStorage.setItem(`${SESSION_KEY_PREFIX}${projectId}`, sessionId);
  } catch {
    // Storage unavailable (private mode etc.) — session just won't survive refresh.
  }
}

export function clearStoredSessionId(projectId: string): void {
  try {
    // The session token is keyed by conversation id, so clear the current conversation's token.
    const current = localStorage.getItem(`${SESSION_KEY_PREFIX}${projectId}`);
    localStorage.removeItem(`${SESSION_KEY_PREFIX}${projectId}`);
    if (current) localStorage.removeItem(`${SESSION_TOKEN_KEY_PREFIX}${current}`);
  } catch {
    // ignore
  }
}

export function clearStoredSessionToken(conversationId: string): void {
  try {
    localStorage.removeItem(`${SESSION_TOKEN_KEY_PREFIX}${conversationId}`);
  } catch {
    // ignore
  }
}

export function clearPublicConversationState(
  projectId: string,
  conversationId?: string | null
): void {
  try {
    const active = localStorage.getItem(`${SESSION_KEY_PREFIX}${projectId}`);
    if (!conversationId || active === conversationId) {
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${projectId}`);
    }
    const tokenConversationId = conversationId || active;
    if (tokenConversationId) {
      localStorage.removeItem(`${SESSION_TOKEN_KEY_PREFIX}${tokenConversationId}`);
    }
  } catch {
    // ignore
  }
}

/**
 * Widget session token (issued at conversation create) that authorizes the public
 * per-conversation read routes. Keyed by CONVERSATION id (not project) so a visitor with
 * several conversations keeps a distinct token per thread — switching threads in the
 * "Recent conversations" UI uses the right token. Read at call time.
 */
export function getStoredSessionToken(conversationId: string): string | null {
  try {
    return localStorage.getItem(`${SESSION_TOKEN_KEY_PREFIX}${conversationId}`);
  } catch {
    return null;
  }
}

export function storeSessionToken(
  conversationId: string,
  sessionToken: string
): void {
  try {
    localStorage.setItem(
      `${SESSION_TOKEN_KEY_PREFIX}${conversationId}`,
      sessionToken
    );
  } catch {
    // Storage unavailable — token just won't survive refresh.
  }
}

/** Cached "lead form completed" flag so returning visitors skip the /status round-trip. */
export function getLeadFormCompleted(projectId: string): boolean {
  try {
    return localStorage.getItem(`${LEAD_KEY_PREFIX}${projectId}`) === "1";
  } catch {
    return false;
  }
}

export function setLeadFormCompleted(projectId: string): void {
  try {
    localStorage.setItem(`${LEAD_KEY_PREFIX}${projectId}`, "1");
  } catch {
    // ignore
  }
}
