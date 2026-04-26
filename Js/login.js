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
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Invalid username/email or password');
      }
      throw new Error(`Login failed (${res.status})`);
    }

    const data = await res.json();

    if (!data || !data.token) {
      throw new Error('Invalid response from server');
    }

    localStorage.setItem('token', data.token);
    window.location.href = 'profile.html';
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed. Please try again.';
  }
});

