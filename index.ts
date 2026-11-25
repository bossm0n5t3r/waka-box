type EnvironmentVariable = "GH_TOKEN" | "GIST_ID" | "WAKATIME_OAUTH_TOKEN";

interface WakaTimeLanguage {
  name: string;
  percent: number;
  text: string;
}

interface WakaTimeCategory {
  name: string;
  total_seconds: number;
}

interface WakaTimeStats {
  data: {
    languages: WakaTimeLanguage[];
    categories: WakaTimeCategory[];
  };
}

interface GitHubGist {
  files: Record<string, unknown>;
}

const requireEnvironmentVariable = (name: EnvironmentVariable): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const gistId = requireEnvironmentVariable("GIST_ID");
const githubToken = requireEnvironmentVariable("GH_TOKEN");
const wakatimeApiKey = requireEnvironmentVariable("WAKATIME_OAUTH_TOKEN");
const aiGistId = process.env.AI_GIST_ID || undefined;

const AI_CATEGORY_NAME = "AI Coding";

const main = async (): Promise<void> => {
  const stats = await getWakaTimeStats();
  await updateLanguageGist(stats);
  if (aiGistId) {
    await updateAiGist(stats, aiGistId);
  }
};

const getWakaTimeStats = async (): Promise<WakaTimeStats> => {
  const response = await fetch(
    "https://wakatime.com/api/v1/users/current/stats/last_7_days",
    {
      headers: {
        Authorization: `Basic ${Buffer.from(wakatimeApiKey).toString("base64")}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Unable to get WakaTime stats: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

const trimRightStr = (str: string, len: number): string => {
  // Ellipsis takes 3 positions, so the index of substring is 0 to total length - 3.
  return str.length > len ? str.substring(0, len - 3) + "..." : str;
};

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hr" : "hrs"}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "min" : "mins"}`);

  return parts.length > 0 ? parts.join(" ") : "0 secs";
};

const formatLine = (name: string, time: string, percent: number): string =>
  [
    trimRightStr(name, 10).padEnd(10),
    time.padEnd(14),
    generateBarChart(percent, 21),
    String(percent.toFixed(1)).padStart(5) + "%",
  ].join(" ");

const githubRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${githubToken}`);
  headers.set("User-Agent", "waka-box");
  headers.set("X-GitHub-Api-Version", "2026-03-10");

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
};

const updateGistFile = async (
  id: string,
  title: string,
  content: string,
): Promise<void> => {
  const path = `/gists/${encodeURIComponent(id)}`;
  const gist = await githubRequest<GitHubGist>(path);
  const filename = Object.keys(gist.files)[0];

  if (!filename) {
    throw new Error("Gist has no files to update");
  }

  await githubRequest<unknown>(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: {
        [filename]: {
          filename: title,
          content,
        },
      },
    }),
  });
};

const updateLanguageGist = async (stats: WakaTimeStats): Promise<void> => {
  const lines = stats.data.languages
    .slice(0, 5)
    .map(({ name, percent, text }) => formatLine(name, text, percent));

  if (lines.length == 0) return;

  await updateGistFile(
    gistId,
    "📊 Weekly development breakdown",
    lines.join("\n"),
  );
};

const updateAiGist = async (
  stats: WakaTimeStats,
  id: string,
): Promise<void> => {
  const categories = stats.data.categories ?? [];
  const totalSeconds = categories.reduce(
    (sum, category) => sum + category.total_seconds,
    0,
  );

  if (totalSeconds <= 0) return;

  const aiSeconds =
    categories.find((category) => category.name === AI_CATEGORY_NAME)
      ?.total_seconds ?? 0;
  const notAiSeconds = totalSeconds - aiSeconds;

  const lines = [
    formatLine(
      "AI",
      formatDuration(aiSeconds),
      (aiSeconds / totalSeconds) * 100,
    ),
    formatLine(
      "Non-AI",
      formatDuration(notAiSeconds),
      (notAiSeconds / totalSeconds) * 100,
    ),
  ];

  await updateGistFile(id, "🤖 Weekly AI coding breakdown", lines.join("\n"));
};

const generateBarChart = (percent: number, size: number): string => {
  const syms = "░▏▎▍▌▋▊▉█";

  const frac = Math.floor((size * 8 * percent) / 100);
  const barsFull = Math.floor(frac / 8);
  if (barsFull >= size) {
    return syms.substring(8, 9).repeat(size);
  }
  const semi = frac % 8;

  return [syms.substring(8, 9).repeat(barsFull), syms.substring(semi, semi + 1)]
    .join("")
    .padEnd(size, syms.substring(0, 1));
};

(async () => {
  await main();
})();
