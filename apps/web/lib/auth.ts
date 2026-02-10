const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Store access token in memory only (not localStorage) to prevent XSS theft.
// The short-lived access token is acceptable in memory since it expires in 15 minutes.
// The refresh token is stored in an httpOnly cookie set by the API server.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearTokens(): void {
  accessToken = null;
}

export function isAuthenticated(): boolean {
  return accessToken !== null;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send httpOnly refresh cookie
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      headers.set('Authorization', `Bearer ${newToken}`);
      return fetch(url, { ...options, headers, credentials: 'include' });
    } else {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  return response;
}

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Receive httpOnly refresh cookie
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message ?? 'Login failed' };
    }

    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include', // Receive httpOnly refresh cookie
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message ?? 'Registration failed' };
    }

    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  try {
    // Refresh token is sent automatically via httpOnly cookie
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) return false;

    const data = await response.json();

    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }

    return true;
  } catch {
    return false;
  }
}

export function logout(): void {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
