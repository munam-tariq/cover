/**
 * localStorage helpers for the public hosted page.
 *
 * The visitorId is an unguessable, client-generated token that identifies this browser to
 * the API (same trust model as the embeddable widget). The sessionId (= conversation UUID)
 * is persisted per project so a refresh resumes the thread instead of dropping it.
 */

const VISITOR_KEY = "ff_public_visitor";
const SESSION_KEY_PREFIX = "ff_public_session_";
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
    localStorage.removeItem(`${SESSION_KEY_PREFIX}${projectId}`);
  } catch {
    // ignore
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
