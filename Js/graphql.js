const API_DOMAIN = 'learn.reboot01.com';
const AUTH_URL = `https://${API_DOMAIN}/api/auth/signin`;
const GRAPHQL_URL = `https://learn.reboot01.com/api/graphql-engine/v1/graphql`;

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function fetchGraphQL(query, variables = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    throw new Error('No authentication token found');
  }

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join(', '));
  }

  return json.data;
}

function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });
}
