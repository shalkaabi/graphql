token = localStorage.getItem('token');
if (token) {
  const decoded = parseJwt(token);
  if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
    window.location.href = 'profile.html';
  } else {
    localStorage.removeItem('token');
  }
}

form = document.getElementById('loginForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorEl = document.getElementById('error');

  errorEl.textContent = '';

  if (!username || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }

  try {
    const credentials = btoa(`${username}:${password}`);

    const res = await fetch(AUTH_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Invalid username/email or password');
      }
      throw new Error(`Login failed (${res.status})`);
    }

    const text = await res.text();
    let data = null;

    // 1. Try to parse the whole response as JSON (even if Content-Type is wrong)
    try {
      data = JSON.parse(text);
    } catch {
      // Not valid JSON — continue to plain-text checks below
    }

    // 2. If it was JSON but doesn't have a recognized token field, try common keys
    if (data && typeof data === 'object') {
      const token = data.token ?? data.jwt ?? data.accessToken;
      if (token) {
        data = { token: String(token) };
      }
    }

    // 3. If data is still not valid, treat response as plain text (raw JWT or quoted string)
    if (!data || typeof data !== 'object' || !data.token) {
      const cleaned = text.trim().replace(/^"|"$/g, ''); // remove surrounding quotes
      const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
      if (jwtPattern.test(cleaned)) {
        data = { token: cleaned };
      } else {
        throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
      }
    }

    if (!data || !data.token) {
      throw new Error('Invalid response from server: missing token');
    }

    localStorage.setItem('token', data.token);
    window.location.href = 'profile.html';
  } catch (err) {
    if (err instanceof TypeError) {
      errorEl.textContent = 'Network error. Please check your internet connection or try again later.';
    } else {
      errorEl.textContent = err.message || 'Login failed. Please try again.';
    }
  }
});
