// =================== TOKEN VALIDATION ===================

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

// =================== RENDER FUNCTIONS ===================

function renderUser(user) {
  document.getElementById('userId').textContent = user.id ?? '—';
  document.getElementById('userLogin').textContent = user.login ?? '—';
  document.getElementById('welcomeText').textContent = `Welcome, ${user.login || 'User'}`;
}

function renderTotalXP(totalXP) {
  const xp = Number(totalXP) || 0;
  const xpKb = xp > 0 ? (xp / 1000).toFixed(2) + ' KB' : '0 KB';
  const xpNum = xp > 0 ? xp.toLocaleString() : '0';
  document.getElementById('totalXP').innerHTML = `${xpNum} XP<br><span class="small-stat">${xpKb}</span>`;
}

function renderAudit(level, ratio, xpKb, upXP, downXP) {
  document.getElementById('levelCell').textContent = level;
  const ratioDecimal = typeof ratio === 'number' ? ratio.toFixed(2) : parseFloat(ratio).toFixed(2);
  document.getElementById('auditRatioCell').textContent = ratioDecimal;
  document.getElementById('xpKbCell').textContent = xpKb;
  document.getElementById('upXPCell').textContent = upXP > 0 ? upXP.toLocaleString() : '0';
  document.getElementById('downXPCell').textContent = downXP > 0 ? downXP.toLocaleString() : '0';
}

function renderPiscine(pass, fail, total) {
  document.getElementById('piscinePass').textContent = pass;
  document.getElementById('piscineFail').textContent = fail;
  document.getElementById('piscineTotal').textContent = total;
}

// =================== MAIN LOAD FUNCTION ===================

async function loadData() {
  try {
    // Get current user
    const user = await fetchUser();
    
    if (!user) {
      throw new Error('User not found');
    }

    // Get detailed user data
    const userData = await fetchUserData(userId);
    const auditData = await fetchAuditData(userId);
    const piscineData = await fetchPiscineStats(userId);
    const projectData = await fetchProjectXP(userId);
    const skillsData = await fetchSkills(userId);

    // Render to HTML
    renderUser(user);
    renderAudit(auditData.level, auditData.ratio, auditData.totalXPkb, auditData.up, auditData.down);
    renderPiscine(piscineData.pass, piscineData.fail, piscineData.total);

    // Render graphs
    renderXP(auditData.xp);
    drawAuditGraph(auditData.up, auditData.down);
    drawProjectGraph(projectData);
    drawPiscineGraph(piscineData.pass, piscineData.fail, piscineData.exerciseAttempts);
    drawSkillsRadar(skillsData);

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

// Helper for XP graph (calls graph.js)
function renderXP(xpTransactions) {
  drawXPGraph(xpTransactions);
}

// =================== INIT ===================

document.addEventListener('DOMContentLoaded', loadData);
