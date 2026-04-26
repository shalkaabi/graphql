const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'index.html';
}

const decoded = parseJwt(token);
if (!decoded || (decoded.exp && decoded.exp * 1000 <= Date.now())) {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

const userId = decoded?.sub || decoded?.userId || decoded?.id;

if (!userId) {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

// =================== QUERY DEFINITIONS ===================

// 1. NORMAL QUERY — no arguments, no nesting beyond root fields
const normalUserQuery = `
  {
    user {
      id
      login
    }
  }
`;

// 2. ARGUMENT + NESTED QUERY — uses variables/arguments and nested objects
const detailedDataQuery = `
  query ($userId: Int!) {
    user(where: { id: { _eq: $userId } }) {
      id
      login
      auditRatio
    }

    xp: transaction(
      where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
      order_by: { createdAt: asc }
    ) {
      amount
      createdAt
      path
      object {
        name
        type
      }
    }

    up: transaction(
      where: { userId: { _eq: $userId }, type: { _eq: "up" } }
    ) {
      amount
    }

    down: transaction(
      where: { userId: { _eq: $userId }, type: { _eq: "down" } }
    ) {
      amount
    }

    result(where: { userId: { _eq: $userId } }) {
      grade
      path
      object {
        name
        type
      }
    }

    progress(where: { userId: { _eq: $userId } }) {
      grade
      path
      createdAt
      updatedAt
      object {
        name
        type
      }
    }
  }
`;

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

// =================== SVG UTILITIES ===================

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSVG(el, attrs = {}) {
  const element = document.createElementNS(SVG_NS, el);
  for (const [k, v] of Object.entries(attrs)) {
    element.setAttribute(k, v);
  }
  return element;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function animatePath(pathEl, length, duration = 1500) {
  pathEl.style.strokeDasharray = length;
  pathEl.style.strokeDashoffset = length;
  pathEl.getBoundingClientRect(); // trigger reflow
  pathEl.style.transition = `stroke-dashoffset ${duration}ms ease-out`;
  pathEl.style.strokeDashoffset = '0';
}

function animateBars(bars, duration = 800) {
  bars.forEach((bar, i) => {
    const targetWidth = bar.getAttribute('data-width');
    bar.setAttribute('width', '0');
    setTimeout(() => {
      bar.style.transition = `width ${duration}ms ease-out`;
      bar.setAttribute('width', targetWidth);
    }, i * 80);
  });
}

function setupTooltip(svg, tooltipEl, points) {
  const svgRect = svg.getBoundingClientRect();

  points.forEach((pt) => {
    pt.el.addEventListener('mouseenter', () => {
      tooltipEl.innerHTML = pt.html;
      tooltipEl.style.opacity = '1';
    });
    pt.el.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      tooltipEl.style.left = e.clientX - rect.left + 12 + 'px';
      tooltipEl.style.top = e.clientY - rect.top - 12 + 'px';
    });
    pt.el.addEventListener('mouseleave', () => {
      tooltipEl.style.opacity = '0';
    });
  });
}

// =================== GRAPH 1: XP OVER TIME ===================

function drawXPGraph(transactions) {
  const svg = document.getElementById('xpGraph');
  const tooltip = document.getElementById('xpTooltip');
  svg.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    svg.appendChild(createSVG('text', { x: 400, y: 175, 'text-anchor': 'middle', fill: '#fff', 'font-size': '16' }));
    svg.lastChild.textContent = 'No XP data available';
    return;
  }

  const width = 800;
  const height = 350;
  const pad = { top: 30, right: 40, bottom: 50, left: 70 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Compute cumulative data
  let cumul = 0;
  const data = transactions.map((t) => {
    cumul += t.amount;
    return { date: new Date(t.createdAt), xp: cumul, raw: t };
  });

  const minDate = data[0].date;
  const maxDate = data[data.length - 1].date;
  const maxXP = data[data.length - 1].xp;

  const dateRange = maxDate.getTime() - minDate.getTime();
  const xScale = (d) => {
    if (dateRange === 0) return pad.left + chartW / 2;
    return pad.left + ((d.getTime() - minDate.getTime()) / dateRange) * chartW;
  };
  const yScale = (xp) => pad.top + chartH - (xp / maxXP) * chartH;

  // Gradient definition
  const defs = createSVG('defs');
  const grad = createSVG('linearGradient', { id: 'xpGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': 'rgba(102,126,234,0.6)' }));
  grad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': 'rgba(102,126,234,0.05)' }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // Grid lines Y
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const val = (maxXP / ySteps) * i;
    const y = yScale(val);
    const line = createSVG('line', {
      x1: pad.left, y1: y, x2: width - pad.right, y2: y,
      stroke: 'rgba(255,255,255,0.1)', 'stroke-width': '1',
    });
    svg.appendChild(line);
    const text = createSVG('text', {
      x: pad.left - 10, y: y + 4, 'text-anchor': 'end', fill: 'rgba(255,255,255,0.7)', 'font-size': '11',
    });
    text.textContent = Math.round(val).toLocaleString();
    svg.appendChild(text);
  }

  // Grid lines X (dates)
  const xSteps = Math.min(data.length - 1, 6);
  for (let i = 0; i <= xSteps; i++) {
    const idx = Math.round(((data.length - 1) / xSteps) * i);
    const d = data[idx].date;
    const x = xScale(d);
    const text = createSVG('text', {
      x: x, y: height - pad.bottom + 20, 'text-anchor': 'middle', fill: 'rgba(255,255,255,0.7)', 'font-size': '11',
    });
    text.textContent = formatDate(d);
    svg.appendChild(text);
  }

  // Area path
  let areaPath = `M ${xScale(data[0].date)} ${yScale(data[0].xp)}`;
  data.forEach((pt) => {
    areaPath += ` L ${xScale(pt.date)} ${yScale(pt.xp)}`;
  });
  areaPath += ` L ${xScale(data[data.length - 1].date)} ${height - pad.bottom} L ${xScale(data[0].date)} ${height - pad.bottom} Z`;

  const area = createSVG('path', { d: areaPath, fill: 'url(#xpGrad)', stroke: 'none' });
  svg.appendChild(area);

  // Line path
  let linePath = `M ${xScale(data[0].date)} ${yScale(data[0].xp)}`;
  data.forEach((pt) => {
    linePath += ` L ${xScale(pt.date)} ${yScale(pt.xp)}`;
  });

  const line = createSVG('path', {
    d: linePath, fill: 'none', stroke: '#fff', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });
  svg.appendChild(line);

  // Animate line
  const length = line.getTotalLength ? line.getTotalLength() : 2000;
  animatePath(line, length, 1800);

  // Hover points
  const tooltipPoints = [];
  data.forEach((pt, i) => {
    if (i % Math.ceil(data.length / 20) !== 0 && i !== data.length - 1) return;

    const cx = xScale(pt.date);
    const cy = yScale(pt.xp);

    const circle = createSVG('circle', {
      cx, cy, r: '4', fill: '#fff', stroke: '#667eea', 'stroke-width': '2',
      style: 'cursor:pointer; transition: all 0.2s ease;',
    });
    svg.appendChild(circle);

    tooltipPoints.push({
      el: circle,
      html: `<strong>${formatDate(pt.date)}</strong><br/>+${pt.raw.amount.toLocaleString()} XP<br/>Total: ${pt.xp.toLocaleString()} XP`,
    });

    circle.addEventListener('mouseenter', () => circle.setAttribute('r', '7'));
    circle.addEventListener('mouseleave', () => circle.setAttribute('r', '4'));
  });

  setupTooltip(svg, tooltip, tooltipPoints);

  // Axis labels
  const yLabel = createSVG('text', {
    x: 20, y: height / 2, fill: 'rgba(255,255,255,0.8)', 'font-size': '12', 'text-anchor': 'middle',
    transform: `rotate(-90, 20, ${height / 2})`,
  });
  yLabel.textContent = 'Cumulative XP';
  svg.appendChild(yLabel);
}

// =================== GRAPH 2: AUDIT DONUT ===================

function drawAuditGraph(up, down) {
  const svg = document.getElementById('auditGraph');
  const tooltip = document.getElementById('auditTooltip');
  svg.innerHTML = '';

  const total = up + down || 1;
  const upAngle = (up / total) * 360;

  const cx = 180;
  const cy = 150;
  const r = 100;
  const innerR = 60;

  function polar(cx, cy, r, angle) {
    const rad = (Math.PI * angle) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function donutArc(start, end, color, label, value) {
    const p1 = polar(cx, cy, r, start - 90);
    const p2 = polar(cx, cy, r, end - 90);
    const p3 = polar(cx, cy, innerR, end - 90);
    const p4 = polar(cx, cy, innerR, start - 90);

    const largeArc = end - start > 180 ? 1 : 0;

    const d = `
      M ${p1.x} ${p1.y}
      A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}
      L ${p3.x} ${p3.y}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}
      Z
    `;

    const path = createSVG('path', {
      d, fill: color, stroke: 'rgba(255,255,255,0.2)', 'stroke-width': '1',
      style: 'cursor:pointer; transition: opacity 0.2s ease;',
    });

    path.addEventListener('mouseenter', () => {
      path.style.opacity = '0.85';
      tooltip.innerHTML = `<strong>${label}</strong><br/>${value.toLocaleString()}`;
      tooltip.style.opacity = '1';
    });
    path.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      tooltip.style.left = e.clientX - rect.left + 12 + 'px';
      tooltip.style.top = e.clientY - rect.top - 12 + 'px';
    });
    path.addEventListener('mouseleave', () => {
      path.style.opacity = '1';
      tooltip.style.opacity = '0';
    });

    svg.appendChild(path);
  }

  donutArc(0, upAngle, '#4caf50', 'Audits Done', up);
  donutArc(upAngle, 360, '#f44336', 'Audits Received', down);

  // Center text
  const centerText = createSVG('text', {
    x: cx, y: cy - 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': '16', 'font-weight': '600',
  });
  centerText.textContent = 'Ratio';
  svg.appendChild(centerText);

  const centerVal = createSVG('text', {
    x: cx, y: cy + 18, 'text-anchor': 'middle', fill: '#fff', 'font-size': '18', 'font-weight': '700',
  });
  const ratioVal = down > 0 ? (up / down).toFixed(2) : up > 0 ? '∞' : '0';
  centerVal.textContent = ratioVal;
  svg.appendChild(centerVal);

  // Legend
  const legendY = 280;
  const legendItems = [
    { color: '#4caf50', label: `Done (${up.toLocaleString()})` },
    { color: '#f44336', label: `Received (${down.toLocaleString()})` },
  ];

  legendItems.forEach((item, i) => {
    const x = cx - 80 + i * 100;
    const rect = createSVG('rect', { x, y: legendY, width: 14, height: 14, rx: 3, fill: item.color });
    svg.appendChild(rect);
    const text = createSVG('text', { x: x + 20, y: legendY + 12, fill: 'rgba(255,255,255,0.9)', 'font-size': '12' });
    text.textContent = item.label;
    svg.appendChild(text);
  });
}

// =================== GRAPH 3: PROJECT XP BARS ===================

function drawProjectGraph(projectData) {
  const svg = document.getElementById('projectGraph');
  const tooltip = document.getElementById('projectTooltip');
  svg.innerHTML = '';

  if (!projectData || projectData.length === 0) {
    svg.appendChild(createSVG('text', { x: 200, y: 150, 'text-anchor': 'middle', fill: '#fff', 'font-size': '16' }));
    svg.lastChild.textContent = 'No project data';
    return;
  }

  const width = 400;
  const height = 300;
  const pad = { top: 20, right: 20, bottom: 20, left: 140 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxXP = projectData[0][1];
  const barHeight = chartH / projectData.length * 0.7;
  const barGap = chartH / projectData.length * 0.3;

  const bars = [];

  projectData.forEach(([name, xp], i) => {
    const y = pad.top + i * (barHeight + barGap) + barGap / 2;
    const barW = (xp / maxXP) * chartW;

    // Label
    const label = createSVG('text', {
      x: pad.left - 10, y: y + barHeight / 2 + 4,
      'text-anchor': 'end', fill: 'rgba(255,255,255,0.85)', 'font-size': '11',
    });
    label.textContent = name.length > 18 ? name.slice(0, 16) + '…' : name;
    svg.appendChild(label);

    // Bar background
    const bg = createSVG('rect', {
      x: pad.left, y, width: chartW, height: barHeight,
      rx: 4, fill: 'rgba(255,255,255,0.05)',
    });
    svg.appendChild(bg);

    // Bar
    const bar = createSVG('rect', {
      x: pad.left, y, height: barHeight,
      rx: 4, fill: 'url(#barGrad)',
      'data-width': barW,
    });
    svg.appendChild(bar);
    bars.push(bar);

    // Value text
    const valText = createSVG('text', {
      x: pad.left + barW + 6, y: y + barHeight / 2 + 4,
      fill: 'rgba(255,255,255,0.8)', 'font-size': '11', opacity: '0',
      style: 'transition: opacity 0.5s ease;',
    });
    valText.textContent = xp.toLocaleString();
    svg.appendChild(valText);

    // Tooltip events
    bar.addEventListener('mouseenter', () => {
      tooltip.innerHTML = `<strong>${name}</strong><br/>${xp.toLocaleString()} XP`;
      tooltip.style.opacity = '1';
      bar.style.opacity = '0.85';
    });
    bar.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      tooltip.style.left = e.clientX - rect.left + 12 + 'px';
      tooltip.style.top = e.clientY - rect.top - 12 + 'px';
    });
    bar.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
      bar.style.opacity = '1';
    });

    // Show value after animation
    setTimeout(() => {
      valText.setAttribute('opacity', '1');
    }, 600 + i * 80);
  });

  // Bar gradient
  const defs = createSVG('defs');
  const grad = createSVG('linearGradient', { id: 'barGrad', x1: '0', y1: '0', x2: '1', y2: '0' });
  grad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': '#667eea' }));
  grad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': '#764ba2' }));
  defs.appendChild(grad);
  svg.prepend(defs);

  animateBars(bars, 900);
}

// =================== GRAPH 4: PISCINE STATS ===================

function drawPiscineGraph(pass, fail, exerciseAttempts) {
  const svg = document.getElementById('piscineGraph');
  const tooltip = document.getElementById('piscineTooltip');
  svg.innerHTML = '';

  const total = pass + fail || 1;
  const passAngle = (pass / total) * 360;

  const cx = 180;
  const cy = 130;
  const r = 90;
  const innerR = 55;

  function polar(cx, cy, r, angle) {
    const rad = (Math.PI * angle) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function donutArc(start, end, color, label, value) {
    const p1 = polar(cx, cy, r, start - 90);
    const p2 = polar(cx, cy, r, end - 90);
    const p3 = polar(cx, cy, innerR, end - 90);
    const p4 = polar(cx, cy, innerR, start - 90);

    const largeArc = end - start > 180 ? 1 : 0;

    const d = `
      M ${p1.x} ${p1.y}
      A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}
      L ${p3.x} ${p3.y}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}
      Z
    `;

    const path = createSVG('path', {
      d, fill: color, stroke: 'rgba(255,255,255,0.2)', 'stroke-width': '1',
      style: 'cursor:pointer; transition: opacity 0.2s ease;',
    });

    path.addEventListener('mouseenter', () => {
      path.style.opacity = '0.85';
      tooltip.innerHTML = `<strong>${label}</strong><br/>${value.toLocaleString()}`;
      tooltip.style.opacity = '1';
    });
    path.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      tooltip.style.left = e.clientX - rect.left + 12 + 'px';
      tooltip.style.top = e.clientY - rect.top - 12 + 'px';
    });
    path.addEventListener('mouseleave', () => {
      path.style.opacity = '1';
      tooltip.style.opacity = '0';
    });

    svg.appendChild(path);
  }

  donutArc(0, passAngle, '#2196f3', 'Passed', pass);
  donutArc(passAngle, 360, '#ff9800', 'Failed', fail);

  // Center text
  const centerText = createSVG('text', {
    x: cx, y: cy - 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': '14', 'font-weight': '600',
  });
  centerText.textContent = 'Piscine';
  svg.appendChild(centerText);

  const centerVal = createSVG('text', {
    x: cx, y: cy + 14, 'text-anchor': 'middle', fill: '#fff', 'font-size': '16', 'font-weight': '700',
  });
  centerVal.textContent = `${pass}/${total}`;
  svg.appendChild(centerVal);

  // Legend
  const legendY = 250;
  const legendItems = [
    { color: '#2196f3', label: `Pass (${pass})` },
    { color: '#ff9800', label: `Fail (${fail})` },
  ];

  legendItems.forEach((item, i) => {
    const x = cx - 70 + i * 90;
    const rect = createSVG('rect', { x, y: legendY, width: 14, height: 14, rx: 3, fill: item.color });
    svg.appendChild(rect);
    const text = createSVG('text', { x: x + 20, y: legendY + 12, fill: 'rgba(255,255,255,0.9)', 'font-size': '12' });
    text.textContent = item.label;
    svg.appendChild(text);
  });
}

// =================== INIT ===================

document.addEventListener('DOMContentLoaded', loadData);
