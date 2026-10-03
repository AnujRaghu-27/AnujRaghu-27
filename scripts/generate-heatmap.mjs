import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = "AnujRaghu-27";

if (!TOKEN) {
  console.error("❌ GITHUB_TOKEN is missing from .env");
  process.exit(1);
}

const query = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              color
              weekday
            }
          }
        }
      }
    }
  }
`;

async function getContributions() {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",

    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "AnujRaghu-27-contribution-heatmap"
    },

    body: JSON.stringify({
      query,
      variables: {
        username: USERNAME
      }
    })
  });

  if (!response.ok) {
    console.error(`❌ GitHub API error: ${response.status}`);
    process.exit(1);
  }

  const result = await response.json();

  if (result.errors) {
    console.error(result.errors);
    process.exit(1);
  }

  return result.data.user.contributionsCollection.contributionCalendar;
}

function parseDate(date) {
  return new Date(`${date}T00:00:00Z`);
}

function formatMonth(date) {
  return date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC"
  });
}

async function generateHeatmap() {
  console.log("Fetching GitHub contribution data...");

  const calendar = await getContributions();

  console.log(
    `Total contributions: ${calendar.totalContributions}`
  );

  // --------------------------------------------------
  // Store every contribution day
  // --------------------------------------------------

  const contributionMap = new Map();

  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      contributionMap.set(day.date, day);
    }
  }

  // --------------------------------------------------
  // Rolling 12-month calendar
  // --------------------------------------------------

  const today = new Date();

  today.setUTCHours(0, 0, 0, 0);

  // Same date one year ago
  const oneYearAgo = new Date(today);

  oneYearAgo.setUTCFullYear(
    oneYearAgo.getUTCFullYear() - 1
  );

  /*
    GitHub's contribution graph looks cleaner when the
    first visible column begins at a complete Sunday.

    Move forward to the first Sunday after the
    one-year-ago date.

    This removes the awkward partial first week that
    was producing the isolated square at the beginning.
  */

  const calendarStart = new Date(oneYearAgo);

  const daysUntilSunday =
    (7 - calendarStart.getUTCDay()) % 7;

  calendarStart.setUTCDate(
    calendarStart.getUTCDate() + daysUntilSunday
  );

  // --------------------------------------------------
  // Build weeks
  // --------------------------------------------------

  const weeks = [];

  let currentWeekStart = new Date(calendarStart);

  while (currentWeekStart <= today) {
    const week = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(currentWeekStart);

      date.setUTCDate(
        currentWeekStart.getUTCDate() + dayIndex
      );

      // Don't render future days
      if (date > today) {
        week.push(null);
        continue;
      }

      const dateString = date
        .toISOString()
        .split("T")[0];

      const contribution =
        contributionMap.get(dateString);

      if (contribution) {
        week.push(contribution);
      } else {
        week.push({
          date: dateString,
          contributionCount: 0,
          color: "#161b22",
          weekday: dayIndex
        });
      }
    }

    weeks.push(week);

    currentWeekStart.setUTCDate(
      currentWeekStart.getUTCDate() + 7
    );
  }

  // --------------------------------------------------
  // Layout
  // --------------------------------------------------

  const cellSize = 11;
  const gap = 4;

  const leftPadding = 34;
  const topPadding = 30;

  const rightPadding = 10;
  const bottomPadding = 30;

  const weekWidth = cellSize + gap;

  const width =
    leftPadding +
    weeks.length * weekWidth +
    rightPadding;

  const height =
    topPadding +
    7 * weekWidth +
    bottomPadding;

  // --------------------------------------------------
  // Month labels
  // --------------------------------------------------

  const monthLabels = [];

  let lastMonth = null;
  let lastYear = null;

  weeks.forEach((week, weekIndex) => {
    for (const day of week) {
      if (!day) continue;

      const date = parseDate(day.date);

      const month = date.getUTCMonth();
      const year = date.getUTCFullYear();

      if (
        month !== lastMonth ||
        year !== lastYear
      ) {
        monthLabels.push({
          label: formatMonth(date),
          weekIndex
        });

        lastMonth = month;
        lastYear = year;
      }

      break;
    }
  });

  let months = "";

  monthLabels.forEach(({ label, weekIndex }) => {
    const x =
      leftPadding +
      weekIndex * weekWidth;

    months += `
      <text
        x="${x}"
        y="17"
        fill="#8b949e"
        font-size="11"
        font-family="Arial, Helvetica, sans-serif"
      >
        ${label}
      </text>
    `;
  });

  // --------------------------------------------------
  // Weekday labels
  // --------------------------------------------------

  const weekdayLabels = [
    { text: "Mon", row: 1 },
    { text: "Wed", row: 3 },
    { text: "Fri", row: 5 }
  ];

  let weekdays = "";

  weekdayLabels.forEach(({ text, row }) => {
    const y =
      topPadding +
      row * weekWidth +
      9;

    weekdays += `
      <text
        x="0"
        y="${y}"
        fill="#8b949e"
        font-size="10"
        font-family="Arial, Helvetica, sans-serif"
      >
        ${text}
      </text>
    `;
  });

  // --------------------------------------------------
  // Contribution cells
  // --------------------------------------------------

  let cells = "";

  weeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      if (!day) return;

      const x =
        leftPadding +
        weekIndex * weekWidth;

      const y =
        topPadding +
        dayIndex * weekWidth;

      cells += `
        <rect
          x="${x}"
          y="${y}"
          width="${cellSize}"
          height="${cellSize}"
          rx="2"
          fill="${day.color}"
          class="cell week-${weekIndex}"
        >
          <title>
            ${day.date} — ${day.contributionCount} contributions
          </title>
        </rect>
      `;
    });
  });

  // --------------------------------------------------
  // Left → right animation
  // --------------------------------------------------

  const animationRules = weeks
    .map(
      (_, weekIndex) => `
        .week-${weekIndex} {
          animation-delay: ${(weekIndex * 0.045).toFixed(3)}s;
        }
      `
    )
    .join("\n");

  // --------------------------------------------------
  // Legend
  // --------------------------------------------------

  const legendColors = [
    "#161b22",
    "#0e4429",
    "#006d32",
    "#26a641",
    "#39d353"
  ];

  let legend = "";

  const legendY = height - 10;

  legend += `
    <text
      x="${width - 145}"
      y="${legendY}"
      fill="#8b949e"
      font-size="10"
      font-family="Arial, Helvetica, sans-serif"
    >
      Less
    </text>
  `;

  legendColors.forEach((color, index) => {
    legend += `
      <rect
        x="${width - 113 + index * 15}"
        y="${legendY - 9}"
        width="10"
        height="10"
        rx="2"
        fill="${color}"
      />
    `;
  });

  legend += `
    <text
      x="${width - 35}"
      y="${legendY}"
      fill="#8b949e"
      font-size="10"
      font-family="Arial, Helvetica, sans-serif"
    >
      More
    </text>
  `;

  // --------------------------------------------------
  // Final SVG
  // --------------------------------------------------

  const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>

  <style>

    .cell {
      opacity: 0;
      animation: reveal 0.18s ease-out forwards;
    }

    ${animationRules}

    @keyframes reveal {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .cell {
        animation: none;
        opacity: 1;
      }
    }

  </style>

  ${months}

  ${weekdays}

  ${cells}

  <text
    x="${leftPadding}"
    y="${height - 10}"
    fill="#c9d1d9"
    font-size="11"
    font-family="Arial, Helvetica, sans-serif"
  >
    ${calendar.totalContributions} contributions
  </text>

  ${legend}

</svg>
`;

  // --------------------------------------------------
  // Save
  // --------------------------------------------------

  const outputPath = path.join(
    process.cwd(),
    "assets",
    "contribution-heatmap.svg"
  );

  fs.writeFileSync(
    outputPath,
    svg.trim()
  );

  console.log("✅ Contribution heatmap generated!");
  console.log(`📁 ${outputPath}`);
}

generateHeatmap();