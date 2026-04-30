// =================== JWT PARSING ===================

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

// =================== GRAPHQL QUERIES ===================

const normalUserQuery = `
  {
    user {
      id
      login
    }
  }
`;

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
      id
      type
      amount
      createdAt
      path
      objectId
      object {
        id
        name
        type
      }
      attrs
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

    skill: transaction(
      where: { userId: { _eq: $userId }, type: { _like: "skill_%" } }
      order_by: { amount: desc }
    ) {
      type
      amount
      createdAt
    }

    level: event_user(
      where: { userId: { _eq: $userId } }
      order_by: { level: desc }
      limit: 1
    ) {
      level
    }
  }
`;

// =================== FETCH API ===================

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

// =================== DATA FETCHING FUNCTIONS ===================

// Get basic user info
async function fetchUser() {
  const data = await fetchGraphQL(normalUserQuery);
  return data?.user?.[0];
}

// Get detailed user data
async function fetchUserData(userId) {
  const data = await fetchGraphQL(detailedDataQuery, { userId: Number(userId) });
  return data;
}

// Filter piscine XP from transactions
function filterPiscineXP(xpTransactions) {
  const excludePatterns = ['bh-piscine', 'piscine-js'];
  return xpTransactions.filter((t) => {
    const path = t.path || '';
    const name = t.object?.name || '';
    return !excludePatterns.some((pattern) => path.includes(pattern) || name.includes(pattern));
  });
}

// Get total XP
async function fetchTotalXP(userId) {
  const data = await fetchGraphQL(detailedDataQuery, { userId: Number(userId) });
  const filteredXP = filterPiscineXP(data?.xp || []);
  const total = filteredXP.reduce((sum, t) => sum + t.amount, 0);
  return total;
}

// Get audit data
async function fetchAuditData(userId) {
  const data = await fetchGraphQL(detailedDataQuery, { userId: Number(userId) });
  
  const filteredXP = filterPiscineXP(data?.xp || []);
  const up = (data?.up || []).reduce((sum, t) => sum + t.amount, 0);
  const down = (data?.down || []).reduce((sum, t) => sum + t.amount, 0);
  const ratio = data?.user?.[0]?.auditRatio ?? (down > 0 ? (up / down).toFixed(2) : up > 0 ? '∞' : '0');
  const level = data?.level?.[0]?.level ?? '—';
  const totalXP = filteredXP.reduce((sum, t) => sum + t.amount, 0);
  const totalXPkb = totalXP > 0 ? (totalXP / 1000).toFixed(2) + ' KB' : '0 KB';

return {
    up,
    down,
    ratio,
    level,
    totalXP,
    totalXPkb,
    xp: filteredXP,
    levelData: data?.level || [],
    skillData: data?.skill || [],
    progressData: data?.progress || [],
    resultData: data?.result || []
  };
}

// Get piscine stats
async function fetchPiscineStats(userId) {
  const data = await fetchGraphQL(detailedDataQuery, { userId: Number(userId) });
  
  const piscinePaths = ['piscine-go', 'piscine-js'];
  const piscineItems = [];

  [...(data?.progress || []), ...(data?.result || [])].forEach((item) => {
    const path = item.path || '';
    const isPiscine = piscinePaths.some((p) => path.includes(p));
    if (isPiscine) {
      piscineItems.push(item);
    }
  });

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

  return {
    pass,
    fail,
    total: pass + fail,
    exerciseAttempts
  };
}

// Get project XP data
async function fetchProjectXP(userId) {
  const data = await fetchGraphQL(detailedDataQuery, { userId: Number(userId) });
  const filteredXP = filterPiscineXP(data?.xp || []);
  
  const projectMap = {};
  filteredXP.forEach((t) => {
    const name = t.object?.name || t.path?.split('/').pop() || 'Unknown';
    projectMap[name] = (projectMap[name] || 0) + t.amount;
  });

  const sorted = Object.entries(projectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return sorted;
}

// Get skills data
async function fetchSkills(userId) {
  const data = await fetchGraphQL(detailedDataQuery, { userId: Number(userId) });
  return data?.skill || [];
}
