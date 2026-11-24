import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REPOSITORY_URL = "https://github.com/brahdee/cade";

export interface GitInfo {
  commitCount: number;
  hash: string;
  timestamp: number;
  message: string;
}

export async function getGitInfo(): Promise<GitInfo | null> {
  try {
    const [countResult, logResult] = await Promise.all([
      execFileAsync("git", ["rev-list", "--count", "HEAD"], {
        cwd: process.cwd(),
      }),

      execFileAsync("git", ["log", "-1", "--pretty=format:%h%n%at%n%s"], {
        cwd: process.cwd(),
      }),
    ]);

    const commitCount = Number(countResult.stdout.trim());

    const [hash, timestampString, ...messageParts] = logResult.stdout
      .trimEnd()
      .split("\n");

    const timestamp = Number(timestampString);

    if (
      !Number.isSafeInteger(commitCount) ||
      !hash ||
      !Number.isSafeInteger(timestamp)
    ) {
      return null;
    }

    return {
      commitCount,
      hash,
      timestamp,
      message: messageParts.join("\n"),
    };
  } catch (error) {
    console.warn("[Git] Could not retrieve commit information:", error);
    return null;
  }
}

export { REPOSITORY_URL };
