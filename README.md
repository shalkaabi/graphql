# GraphQL Profile Project

A personal profile page built with vanilla HTML, CSS, and JavaScript that consumes a GraphQL API to display school statistics and achievements.

## Features

- **JWT Authentication**: Login page with Basic Auth to obtain a JWT token from the platform's signin endpoint.
- **GraphQL Data Fetching**: Queries user data, XP transactions, audit records, and project results.
- **Profile Dashboard**: Displays user info, total XP, audit ratio, and pass/fail statistics.
- **Interactive SVG Graphs**:
  - **XP Progress Over Time**: Area + line chart showing cumulative XP growth with hover tooltips.
  - **Audit Distribution**: Donut chart visualizing audits done vs. received.
  - **Top Projects by XP**: Horizontal bar chart ranking projects by earned XP.
- **Responsive Design**: Adapts to mobile and desktop screens.
- **Logout**: Clears token and returns to login page.

## Tech Stack

- HTML5
- CSS3 (Grid, Flexbox, backdrop-filter)
- Vanilla JavaScript (ES6+)
- SVG for data visualization
- GraphQL API

## Project Structure

```
.
├── index.html          # Login page
├── profile.html        # Profile dashboard
├── style.css           # Stylesheet
├── Js/
│   ├── graphql.js      # Shared GraphQL utilities, JWT parser, logout
│   ├── login.js        # Login form handler
│   └── profile.js      # Profile data fetching and SVG graph rendering
└── README.md
```

## How to Run

1. Open `index.html` in a modern web browser.
2. Enter your username/email and password.
3. Upon successful login, you will be redirected to `profile.html`.
4. Your profile data and graphs will load automatically.

## GraphQL Query Types Used

- **Normal Query**: `{ user { id login } }`
- **Argument Query**: `user(where: { id: { _eq: $userId } })` with variables
- **Nested Query**: `transaction { amount object { name } }`

## Hosting

This project can be hosted on any static site provider such as GitHub Pages, Netlify, or Vercel.

