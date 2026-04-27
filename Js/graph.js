// =================== SVG UTILITIES ===================

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

function animateBarsVertical(bars, duration = 800) {
  bars.forEach((bar, i) => {
    const targetHeight = parseFloat(bar.getAttribute('data-height'));
    const targetY = parseFloat(bar.getAttribute('data-y'));
    const baseY = targetY + targetHeight;
    bar.setAttribute('height', '0');
    bar.setAttribute('y', baseY);
    setTimeout(() => {
      bar.style.transition = `height ${duration}ms ease-out, y ${duration}ms ease-out`;
      bar.setAttribute('height', targetHeight);
      bar.setAttribute('y', targetY);
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

// =================== GRAPH 2: AUDIT HORIZONTAL BARS ===================

function drawAuditGraph(up, down) {
  const svg = document.getElementById('auditGraph');
  const tooltip = document.getElementById('auditTooltip');
  svg.innerHTML = '';

  const data = [
    { label: 'Audits Done', value: up, color: '#4caf50' },
    { label: 'Audits Received', value: down, color: '#f44336' },
  ];

  const width = 360;
  const height = 300;
  const pad = { top: 40, right: 40, bottom: 30, left: 140 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxVal = Math.max(up, down) || 1;
  const barHeight = (chartH / data.length) * 0.6;
  const barGap = (chartH / data.length) * 0.4;

  const bars = [];

  data.forEach((item, i) => {
    const y = pad.top + i * (barHeight + barGap) + barGap / 2;
    const barW = (item.value / maxVal) * chartW;

    // Label
    const label = createSVG('text', {
      x: pad.left - 10, y: y + barHeight / 2 + 4,
      'text-anchor': 'end', fill: 'rgba(255,255,255,0.9)', 'font-size': '12',
    });
    label.textContent = item.label;
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
      rx: 4, fill: item.color,
      'data-width': barW,
    });
    svg.appendChild(bar);
    bars.push(bar);

    // Value text
    const valText = createSVG('text', {
      x: pad.left + barW + 6, y: y + barHeight / 2 + 4,
      fill: 'rgba(255,255,255,0.85)', 'font-size': '12', opacity: '0',
      style: 'transition: opacity 0.5s ease;',
    });
    valText.textContent = item.value.toLocaleString();
    svg.appendChild(valText);

    // Tooltip events
    bar.addEventListener('mouseenter', () => {
      tooltip.innerHTML = `<strong>${item.label}</strong><br/>${item.value.toLocaleString()}`;
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

  // Legend
  const legendY = height - 15;
  data.forEach((item, i) => {
    const x = pad.left + i * 120;
    const rect = createSVG('rect', { x, y: legendY, width: 12, height: 12, rx: 3, fill: item.color });
    svg.appendChild(rect);
    const text = createSVG('text', { x: x + 18, y: legendY + 10, fill: 'rgba(255,255,255,0.9)', 'font-size': '11' });
    text.textContent = `${item.label} (${item.value.toLocaleString()})`;
    svg.appendChild(text);
  });

  animateBars(bars, 900);
}

// =================== GRAPH 3: PROJECT XP VERTICAL BARS ===================

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
  const pad = { top: 30, right: 20, bottom: 60, left: 50 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxXP = projectData[0][1];
  const barWidth = (chartW / projectData.length) * 0.7;
  const barGap = (chartW / projectData.length) * 0.3;

  const bars = [];

  projectData.forEach(([name, xp], i) => {
    const x = pad.left + i * (barWidth + barGap) + barGap / 2;
    const barH = (xp / maxXP) * chartH;
    const y = pad.top + chartH - barH;

    // Label
    const label = createSVG('text', {
      x: x + barWidth / 2, y: height - pad.bottom + 15,
      'text-anchor': 'middle', fill: 'rgba(255,255,255,0.85)', 'font-size': '10',
    });
    label.textContent = name.length > 10 ? name.slice(0, 8) + '…' : name;
    svg.appendChild(label);

    // Bar background
    const bg = createSVG('rect', {
      x, y: pad.top, width: barWidth, height: chartH,
      rx: 4, fill: 'rgba(255,255,255,0.05)',
    });
    svg.appendChild(bg);

    // Bar
    const bar = createSVG('rect', {
      x, width: barWidth,
      rx: 4, fill: 'url(#projectBarGrad)',
      'data-height': barH,
      'data-y': y,
    });
    svg.appendChild(bar);
    bars.push(bar);

    // Value text
    const valText = createSVG('text', {
      x: x + barWidth / 2, y: y - 6,
      'text-anchor': 'middle', fill: 'rgba(255,255,255,0.8)', 'font-size': '10', opacity: '0',
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

  // Bar gradient (vertical)
  const defs = createSVG('defs');
  const grad = createSVG('linearGradient', { id: 'projectBarGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': '#667eea' }));
  grad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': '#764ba2' }));
  defs.appendChild(grad);
  svg.prepend(defs);

  animateBarsVertical(bars, 900);
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

// =================== GRAPH 5: TOP SKILLS BAR CHART ===================

function detectLanguage(path) {
  const p = (path || '').toLowerCase();

  // Go
  if (p.includes('piscine-go') || p.includes('/go/') || p.includes('golang')) return 'Go';
  // Js
  if (p.includes('piscine-js') || p.includes('/js/') || p.includes('/javascript/') || p.includes('nodejs')) return 'Js';
  // Front
  if (p.includes('/html/') || p.includes('/css/') || p.includes('/react/') || p.includes('/vue/') || p.includes('/angular/') || p.includes('frontend') || p.includes('dom')) return 'Front';
  // Back
  if (p.includes('backend') || p.includes('server') || p.includes('/api/') || p.includes('/sql/') || p.includes('/database/') || p.includes('/db/')) return 'Back';
  // Algo
  if (p.includes('algo') || p.includes('algorithm') || p.includes('sort') || p.includes('search') || p.includes('data-structure')) return 'Algo';
  // Prog
  if (p.includes('prog') || p.includes('programming') || p.includes('basic') || p.includes('fundamental') || p.includes('intro')) return 'Prog';

  return null;
}

function drawTopSkillsGraph(xpTransactions, results, progressData) {
  const svg = document.getElementById('topSkillsGraph');
  const tooltip = document.getElementById('topSkillsTooltip');
  svg.innerHTML = '';

  // Extract languages from all data sources
  const langStats = {};

  // Scan XP transactions
  xpTransactions.forEach((t) => {
    const path = t.path || '';
    const lang = detectLanguage(path);
    if (lang) {
      if (!langStats[lang]) langStats[lang] = { xp: 0, projects: new Set() };
      langStats[lang].xp += t.amount;
      langStats[lang].projects.add(path);
    }
  });

  // Scan results
  results.forEach((r) => {
    const path = r.path || '';
    const lang = detectLanguage(path);
    if (lang) {
      if (!langStats[lang]) langStats[lang] = { xp: 0, projects: new Set() };
      langStats[lang].projects.add(path);
    }
  });

  // Scan progress
  progressData.forEach((p) => {
    const path = p.path || '';
    const lang = detectLanguage(path);
    if (lang) {
      if (!langStats[lang]) langStats[lang] = { xp: 0, projects: new Set() };
      langStats[lang].projects.add(path);
    }
  });

  const allowedSkills = ['Go', 'Prog', 'Front', 'Back', 'Js', 'Algo'];

  // Build skills array ensuring all 6 exist (even with 0 XP)
  const skills = allowedSkills.map((name) => {
    const data = langStats[name];
    return {
      name,
      xp: data ? data.xp : 0,
      projects: data ? data.projects.size : 0,
    };
  });

  const width = 600;
  const height = 420;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = 130;
  const levels = 5;

  const maxXP = Math.max(...skills.map((s) => s.xp), 1);

  // =================== RADAR GRID ===================
  // Draw concentric polygon levels
  for (let level = 1; level <= levels; level++) {
    const r = (maxRadius / levels) * level;
    const points = skills
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      })
      .join(' ');

    const polygon = createSVG('polygon', {
      points,
      fill: level === levels ? 'rgba(255,255,255,0.03)' : 'none',
      stroke: 'rgba(255,255,255,0.15)',
      'stroke-width': '1',
    });
    svg.appendChild(polygon);
  }

  // =================== AXES & LABELS ===================
  skills.forEach((skill, i) => {
    const angle = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
    const x = cx + maxRadius * Math.cos(angle);
    const y = cy + maxRadius * Math.sin(angle);

    // Axis line
    const line = createSVG('line', {
      x1: cx,
      y1: cy,
      x2: x,
      y2: y,
      stroke: 'rgba(255,255,255,0.2)',
      'stroke-width': '1',
    });
    svg.appendChild(line);

    // Label
    const labelR = maxRadius + 28;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);

    const text = createSVG('text', {
      x: lx,
      y: ly + 4,
      'text-anchor': 'middle',
      fill: 'rgba(255,255,255,0.9)',
      'font-size': '13',
      'font-weight': '500',
    });
    text.textContent = skill.name;
    svg.appendChild(text);
  });

  // =================== DATA POLYGON ===================
  const dataPoints = skills.map((skill, i) => {
    const angle = (Math.PI * 2 * i) / skills.length - Math.PI / 2;
    const r = (skill.xp / maxXP) * maxRadius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      skill,
    };
  });

  const pointsStr = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Gradient definition
  const defs = createSVG('defs');
  const grad = createSVG('linearGradient', {
    id: 'radarGrad',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
  });
  grad.appendChild(createSVG('stop', { offset: '0%', 'stop-color': 'rgba(102,126,234,0.5)' }));
  grad.appendChild(createSVG('stop', { offset: '100%', 'stop-color': 'rgba(118,75,162,0.2)' }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // Fill polygon
  const fillPolygon = createSVG('polygon', {
    points: pointsStr,
    fill: 'url(#radarGrad)',
    stroke: '#667eea',
    'stroke-width': '2.5',
    'stroke-linejoin': 'round',
    style: 'opacity:0; transition: opacity 1.2s ease;',
  });
  svg.appendChild(fillPolygon);

  // =================== DATA POINTS & TOOLTIPS ===================
  const tooltipPoints = [];
  dataPoints.forEach((p) => {
    const circle = createSVG('circle', {
      cx: p.x,
      cy: p.y,
      r: '5',
      fill: '#667eea',
      stroke: '#fff',
      'stroke-width': '2',
      style: 'cursor:pointer; transition: all 0.2s ease;',
    });
    svg.appendChild(circle);

    tooltipPoints.push({
      el: circle,
      html: `<strong>${p.skill.name}</strong><br/>${p.skill.xp.toLocaleString()} XP<br/>${p.skill.projects} project${p.skill.projects !== 1 ? 's' : ''}`,
    });

    circle.addEventListener('mouseenter', () => {
      circle.setAttribute('r', '8');
      circle.setAttribute('fill', '#fff');
      circle.setAttribute('stroke', '#667eea');
    });
    circle.addEventListener('mouseleave', () => {
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', '#667eea');
      circle.setAttribute('stroke', '#fff');
    });
  });

  setupTooltip(svg, tooltip, tooltipPoints);

  // =================== CENTER VALUE ===================
  const centerText = createSVG('text', {
    x: cx,
    y: cy + 4,
    'text-anchor': 'middle',
    fill: 'rgba(255,255,255,0.3)',
    'font-size': '11',
  });
  centerText.textContent = 'SKILLS';
  svg.appendChild(centerText);

  // =================== ANIMATE ===================
  setTimeout(() => {
    fillPolygon.style.opacity = '1';
  }, 100);

  // =================== TITLE ===================
  const title = createSVG('text', {
    x: width / 2,
    y: 18,
    'text-anchor': 'middle',
    fill: 'rgba(255,255,255,0.7)',
    'font-size': '13',
    'font-weight': '500',
  });
  title.textContent = 'Skills Overview (Radar Chart)';
  svg.appendChild(title);
}
