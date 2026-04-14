/**
 * Shared JS for GraphQL Profile App
 * Handles navbar, auth state across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
  // Common navbar setup
  setupNavbar();

  // Update welcome text
  const user = localStorage.getItem('user') || 'Guest';
  const welcomeText = document.getElementById('welcomeText');
  if (welcomeText) {
    welcomeText.textContent = `Welcome, ${user}`;
  }

  // Page-specific
  if (window.location.pathname.includes('profile.html') || document.body.classList.contains('user-mode')) {
    checkAuthAndLoadProfile();
  }
});

function setupNavbar() {
  const accountBtn = document.getElementById('accountBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const body = document.body;

  if (accountBtn) {
    accountBtn.addEventListener('click', function() {
      alert('Account settings - demo!');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('user');
      body.classList.add('guest-mode');
      if (document.getElementById('welcomeText')) {
        document.getElementById('welcomeText').textContent = 'Welcome, Guest';
      }
      alert('Logged out!');
      // Redirect to login if on profile
      if (window.location.pathname.includes('profile.html')) {
        window.location.href = 'index.html';
      }
    });
  }

  // Hide guest elements if logged in
  if (localStorage.getItem('user')) {
    body.classList.remove('guest-mode');
  } else {
    body.classList.add('guest-mode');
  }
}

function checkAuthAndLoadProfile() {
  if (!localStorage.getItem('user')) {
    window.location.href = 'index.html';
    return;
  }
  // Load profile data if on profile page
  if (document.getElementById('userLogin')) {
    document.getElementById('userLogin').textContent = localStorage.getItem('user');
    document.getElementById('userId').textContent = 'user123'; // Demo
  }
  loadProfileData();
}

function loadProfileData() {
  const demoData = {
    totalXP: 1564,
    passes: 48,
    fails: 9
  };
  localStorage.setItem('profileData', JSON.stringify(demoData));

  const totalXP = document.getElementById('totalXP');
  const passCount = document.getElementById('passCount');
  const failCount = document.getElementById('failCount');
  if (totalXP) totalXP.textContent = demoData.totalXP + ' XP';

  if (passCount && failCount) {
    const totalAttempts = demoData.passes + demoData.fails;
    const ratio = totalAttempts > 0 ? Math.round((demoData.passes / totalAttempts) * 100) : 0;
    passCount.textContent = `Passes: ${demoData.passes}`;
    failCount.textContent = `Fails: ${demoData.fails}`;
    document.getElementById('ratioDisplay').textContent = `${ratio}% (${demoData.passes}/${totalAttempts})`;
  }
}

// Exported for page-specific use
window.shared = { checkAuthAndLoadProfile, loadProfileData };

