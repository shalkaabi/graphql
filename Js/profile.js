const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "index.html";
}

// -------------------- JWT PARSER --------------------
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

const decoded = parseJwt(token);
const userId = decoded?.sub || decoded?.userId;

// -------------------- GRAPHQL FETCH --------------------
async function fetchGraphQL(query, variables = {}) {
  try {
    const res = await fetch(
      "https://DOMAIN/api/graphql-engine/v1/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error("GraphQL Error:", err);
    return null;
  }
}

// -------------------- LOGOUT --------------------
function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  });
}

// -------------------- GRAPHQL QUERY --------------------
async function getData() {
  const query = `
    query ($userId: Int!) {
      user(where: {id: {_eq: $userId}}) {
        id
        login
      }

      transaction(
        where: {
          userId: {_eq: $userId},
          type: {_eq: "xp"}
        }
        order_by: {createdAt: asc}
      ) {
        amount
        createdAt
      }

      result(where: {userId: {_eq: $userId}}) {
        grade
      }
    }
  `;

  return await fetchGraphQL(query, { userId });
}

// -------------------- USER RENDER --------------------
function renderUser(user) {
  document.getElementById("userId").textContent = user.id;
  document.getElementById("userLogin").textContent = user.login;
  document.getElementById(
    "welcomeText"
  ).textContent = `Welcome, ${user.login}`;
}

// -------------------- XP CALC --------------------
function calculateXP(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// -------------------- XP GRAPH DATA --------------------
function prepareXP(transactions) {
  let total = 0;
  return transactions.map((t) => {
    total += t.amount;
    return {
      xp: total,
    };
  });
}

// -------------------- XP GRAPH --------------------
function drawXPGraph(data) {
  const svg = document.getElementById("xpGraph");
  if (!svg || !data || data.length === 0) return;

  svg.innerHTML = "";

  const width = 500;
  const height = 300;

  const maxXP = Math.max(...data.map((d) => d.xp), 1);

  const stepX =
    data.length > 1 ? width / (data.length - 1) : width;

  let path = "";

  data.forEach((point, i) => {
    const x = i * stepX;
    const y = height - (point.xp / maxXP) * height;

    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  const line = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

  line.setAttribute("d", path);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#ffffff");
  line.setAttribute("stroke-width", "2");

  svg.appendChild(line);
}

// -------------------- AUDIT CALC --------------------
function calculateRatio(results) {
  let pass = 0;
  let fail = 0;

  results.forEach((r) => {
    if (r.grade >= 1) pass++;
    else fail++;
  });

  return { pass, fail };
}

// -------------------- PIE CHART --------------------
function drawRatioGraph(pass, fail) {
  const svg = document.getElementById("ratioGraph");
  if (!svg) return;

  svg.innerHTML = "";

  const total = pass + fail || 1;
  const passAngle = (pass / total) * 360;

  const cx = 150;
  const cy = 150;
  const r = 100;

  function arc(start, end, color) {
    const x1 = cx + r * Math.cos((Math.PI * start) / 180);
    const y1 = cy + r * Math.sin((Math.PI * start) / 180);

    const x2 = cx + r * Math.cos((Math.PI * end) / 180);
    const y2 = cy + r * Math.sin((Math.PI * end) / 180);

    const largeArc = end - start > 180 ? 1 : 0;

    const path = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );

    path.setAttribute(
      "d",
      `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    );

    path.setAttribute("fill", color);

    svg.appendChild(path);
  }

  arc(0, passAngle, "#4caf50");
  arc(passAngle, 360, "#f44336");
}

// -------------------- INIT --------------------
async function init() {
  const data = await getData();

  if (!data) return;

  const user = data.user?.[0];
  if (!user) return;

  renderUser(user);

  // XP
  const xp = calculateXP(data.transaction || []);
  document.getElementById("totalXP").textContent = xp + " XP";

  const xpData = prepareXP(data.transaction || []);
  drawXPGraph(xpData);

  // AUDIT
  const ratio = calculateRatio(data.result || []);

  document.getElementById("passCount").textContent = ratio.pass;
  document.getElementById("failCount").textContent = ratio.fail;
  document.getElementById(
    "ratioDisplay"
  ).textContent = `${ratio.pass} / ${ratio.fail}`;

  drawRatioGraph(ratio.pass, ratio.fail);

  setupLogout();
}

// -------------------- START SAFE --------------------
document.addEventListener("DOMContentLoaded", init);