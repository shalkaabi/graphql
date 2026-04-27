// =================== API CONFIGURATION ===================
const API_DOMAIN = 'learn.reboot01.com';
const AUTH_URL = `https://${API_DOMAIN}/api/auth/signin`;
const GRAPHQL_URL = `https://learn.reboot01.com/api/graphql-engine/v1/graphql`;

// =================== AUTH STATE ===================
let token = null;
let decoded = null;
let userId = null;

// =================== DOM REFERENCES ===================
let form = null;

// =================== QUERY DEFINITIONS ===================
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

    skill(where: { userId: { _eq: $userId } }) {
      type
      amount
    }
  }
`;

// =================== SVG UTILITIES ===================
const SVG_NS = 'http://www.w3.org/2000/svg';

