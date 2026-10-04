import fs from "fs";
import path from "path";
import * as icons from "simple-icons";

const outputPath = path.join(
  process.cwd(),
  "assets",
  "tech-stack.svg"
);

const technologies = [
  {
    name: "Python",
    icon: "siPython",
  },
  {
    name: "JavaScript",
    icon: "siJavascript",
  },
  {
    name: "HTML5",
    icon: "siHtml5",
  },
  {
    name: "CSS3",
    icon: "siCss",
  },
  {
    name: "React",
    icon: "siReact",
  },
  {
    name: "Tailwind CSS",
    icon: "siTailwindcss",
  },
  {
    name: "Vite",
    icon: "siVite",
  },
  {
    name: "Node.js",
    icon: "siNodedotjs",
  },
  {
    name: "Express.js",
    icon: "siExpress",
  },
  {
    name: "PostgreSQL",
    icon: "siPostgresql",
  },
  {
    name: "Git",
    icon: "siGit",
  },
  {
    name: "GitHub",
    icon: "siGithub",
  },
  {
    name: "Vercel",
    icon: "siVercel",
  },
  {
    name: "Hugging Face",
    icon: "siHuggingface",
  },
];

const rows = [
  technologies.slice(0, 5),
  technologies.slice(5, 9),
  technologies.slice(9, 14),
];

const badgeHeight = 48;
const gap = 12;
const rowGap = 14;
const horizontalPadding = 18;

const badgeWidths = {
  Python: 125,
  JavaScript: 145,
  HTML5: 120,
  CSS3: 115,
  React: 120,

  "Tailwind CSS": 155,
  Vite: 105,
  "Node.js": 125,
  "Express.js": 145,

  PostgreSQL: 145,
  Git: 105,
  GitHub: 120,
  Vercel: 115,
  "Hugging Face": 155,
};

const rowWidths = rows.map((row) =>
  row.reduce(
    (total, tech) => total + badgeWidths[tech.name],
    0
  ) + gap * (row.length - 1)
);

const width = Math.max(...rowWidths) + horizontalPadding * 2;

const height =
  rows.length * badgeHeight +
  (rows.length - 1) * rowGap;

const colors = {
  background: "#0D1117",
  border: "#30363D",
  text: "#E6EDF3",
  iconBackground: "#161B22",
};

let svg = `
<svg
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>

<style>
  .badge {
    fill: ${colors.background};
    stroke: ${colors.border};
    stroke-width: 1;
  }

  .name {
    fill: ${colors.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
      Helvetica, Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
  }
</style>
`;

let y = 0;

rows.forEach((row) => {
  const rowWidth =
    row.reduce(
      (total, tech) => total + badgeWidths[tech.name],
      0
    ) + gap * (row.length - 1);

  let x = (width - rowWidth) / 2;

  row.forEach((tech) => {
    const badgeWidth = badgeWidths[tech.name];

    const icon = icons[tech.icon];

    if (!icon) {
      throw new Error(
        `Icon "${tech.icon}" was not found for ${tech.name}`
      );
    }

    svg += `
      <g>
        <rect
          class="badge"
          x="${x}"
          y="${y}"
          width="${badgeWidth}"
          height="${badgeHeight}"
          rx="8"
        />

        <rect
          x="${x + 10}"
          y="${y + 8}"
          width="32"
          height="32"
          rx="6"
          fill="${colors.iconBackground}"
        />

        <svg
          x="${x + 16}"
          y="${y + 14}"
          width="20"
          height="20"
          viewBox="0 0 24 24"
        >
          <path
            d="${icon.path}"
            fill="#${icon.hex}"
          />
        </svg>

        <text
          class="name"
          x="${x + 52}"
          y="${y + 25}"
          dominant-baseline="middle"
        >${tech.name}</text>
      </g>
    `;

    x += badgeWidth + gap;
  });

  y += badgeHeight + rowGap;
});

svg += `</svg>`;

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(outputPath, svg.trim());

console.log("Tech stack SVG generated successfully.");