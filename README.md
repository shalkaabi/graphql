# GraphQL Profile Project

A personal profile page built with vanilla HTML, CSS, and JavaScript that consumes a GraphQL API to display school statistics and achievements.

## Features

- **JWT Authentication**: Login page with Basic Auth to obtain a JWT token from the platform's signin endpoint.
- **GraphQL Data Fetching**: Queries user data, XP transactions, audit records, project results, and piscine progress.
- **Profile Dashboard**: Displays user info, total XP, audit ratio, pass/fail statistics, and piscine stats.
- **Interactive SVG Graphs**:
  - **XP Progress Over Time**: Area + line chart showing cumulative XP growth with hover tooltips.
  - **Audit Distribution**: Donut chart visualizing audits done vs. received.
  - **Top Projects by XP**: Horizontal bar chart ranking projects by earned XP.
  - **Piscine Stats**: Donut chart showing pass/fail ratio for piscine exercises.
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
│   ├── api.js          # API calls and GraphQL utilities
│   ├── state.js        # Shared state management, JWT parser, 
│   ├── login.js        # Login form handler
│   ├── main.js         # Main entry logic
│   └── graph.js        # Profile data fetching and SVG graph 
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
- **Progress Query**: `progress(where: { userId: { _eq: $userId } }) { grade path }`

## Hosting on GitHub Pages



