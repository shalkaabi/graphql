token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'index.html';
}

decoded = parseJwt(token);
if (!decoded || (decoded.exp && decoded.exp * 1000 <= Date.now())) {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

userId = decoded?.sub || decoded?.userId || decoded?.id;

if (!userId) {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });
}

// =================== DATA FETCHING ===================

async function loadData() {
  try {
    // Demonstrate normal query
    const normalData = await fetchGraphQL(normalUserQuery);
    const normalUser = normalData?.user?.[0];

    // Demonstrate argument + nested query
    const detailedData = await fetchGraphQL(detailedDataQuery, { userId: Number(userId) });
    const user = detailedData?.user?.[0] || normalUser;

    if (!user) {
      throw new Error('User not found');
    }

    renderUser(user);
    renderXP(detailedData.xp || []);
    renderAudits(detailedData.up || [], detailedData.down || [], user.auditRatio);
    renderResults(detailedData.result || []);
    renderProjectXP(detailedData.xp || []);
    renderPiscineStats(detailedData.progress || [], detailedData.result || []);

    // Top skills bar chart
    drawTopSkillsGraph(
      detailedData.xp || [],
      detailedData.result || [],
      detailedData.progress || []
    );

    setupLogout();
  } catch (err) {
    console.error('Profile load error:', err);
    document.querySelector('.profile-container').innerHTML = `
      <section class="card full-width">
        <h3>Error</h3>
        <p>Failed to load profile data.</p>
        <p style="color:#ff6b6b;">${err.message}</p>
        <button class="btn" onclick="localStorage.removeItem('token'); window.location.href='index.html'">Back to Login</button>
      </section>
    `;
  }
}

// =================== RENDER HELPERS ===================

function renderUser(user) {
  document.getElementById('userId').textContent = user.id ?? '—';
  document.getElementById('userLogin').textContent = user.login ?? '—';
  document.getElementById('welcomeText').textContent = `Welcome, ${user.login || 'User'}`;
}

function renderXP(xpTransactions) {
  const total = xpTransactions.reduce((sum, t) => sum + t.amount, 0);
  document.getElementById('totalXP').textContent = total.toLocaleString() + ' XP';
  drawXPGraph(xpTransactions);
}

function renderAudits(upTransactions, downTransactions, serverAuditRatio) {
  const up = upTransactions.reduce((sum, t) => sum + t.amount, 0);
  const down = downTransactions.reduce((sum, t) => sum + t.amount, 0);
  const ratio = serverAuditRatio ?? (down > 0 ? (up / down).toFixed(2) : up > 0 ? '∞' : '0');

  document.getElementById('auditRatio').textContent = ratio;
  document.getElementById('auditUp').textContent = up.toLocaleString();
  document.getElementById('auditDown').textContent = down.toLocaleString();

  drawAuditGraph(up, down);
}

function renderResults(results) {
  let pass = 0;
  let fail = 0;
  results.forEach((r) => {
    if (r.grade >= 1) pass++;
    else fail++;
  });

  document.getElementById('passCount').textContent = pass;
  document.getElementById('failCount').textContent = fail;
  document.getElementById('ratioDisplay').textContent = `${pass} / ${fail}`;
}

function renderProjectXP(xpTransactions) {
  const projectMap = {};
  xpTransactions.forEach((t) => {
    const name = t.object?.name || t.path?.split('/').pop() || 'Unknown';
    projectMap[name] = (projectMap[name] || 0) + t.amount;
  });

  const sorted = Object.entries(projectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  drawProjectGraph(sorted);
}

function renderPiscineStats(progressData, resultData) {
  // Combine progress and result data for piscine entries
  const piscinePaths = ['piscine-go', 'piscine-js'];
  const piscineItems = [];

  [...progressData, ...resultData].forEach((item) => {
    const path = item.path || '';
    const isPiscine = piscinePaths.some((p) => path.includes(p));
    if (isPiscine) {
      piscineItems.push(item);
    }
  });

  // Calculate stats
  let pass = 0;
  let fail = 0;
  const exerciseAttempts = {};

  piscineItems.forEach((item) => {
    const name = item.object?.name || item.path?.split('/').pop() || 'Unknown';
    if (!exerciseAttempts[name]) {
      exerciseAttempts[name] = { attempts: 0, pass: 0, fail: 0 };
    }
    exerciseAttempts[name].attempts++;
    if (item.grade >= 1) {
      pass++;
      exerciseAttempts[name].pass++;
    } else {
      fail++;
      exerciseAttempts[name].fail++;
    }
  });

  const total = pass + fail;
  document.getElementById('piscinePass').textContent = pass;
  document.getElementById('piscineFail').textContent = fail;
  document.getElementById('piscineTotal').textContent = total;

  drawPiscineGraph(pass, fail, exerciseAttempts);
}

// =================== INIT ===================

document.addEventListener('DOMContentLoaded', loadData);
