if (localStorage.getItem('token')) {
  window.location.href = 'profile.html';
}

const form = document.getElementById('loginForm');

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
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Invalid username/email or password');
      }
      throw new Error(`Login failed (${res.status})`);
    }

    const contentType = res.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
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

