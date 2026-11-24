
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";

export type YouTubeDownloadFormat = "video" | "audio";

export interface YouTubeDownloadOptions {
  maxFileSize?: number;
}

export interface YouTubeTimeRange {
  start: number;
  end: number;
}

export interface YouTubeDownload {
  buffer: Buffer;
  filename: string;
  format: YouTubeDownloadFormat;
}

const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024;
const DOWNLOAD_TIMEOUT = 10 * 60 * 1000;

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

export function validateYouTubeUrl(input: string): string {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid YouTube URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !ALLOWED_HOSTS.has(url.hostname.toLowerCase())
  ) {
    throw new Error("Please provide a valid YouTube URL.");
  }

  return url.toString();
}

function executeYtDlp(args: string[]): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    const child = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");

      setTimeout(() => {
        child.kill("SIGKILL");
      }, 5000).unref();
    }, DOWNLOAD_TIMEOUT);

    const cleanup = () => clearTimeout(timeout);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;

      if (stdout.length > 16_384) {
        stdout = stdout.slice(-16_384);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;

      if (stderr.length > 16_384) {
        stderr = stderr.slice(-16_384);
      }
    });

    child.on("error", (error) => {
      if (settled) return;

      settled = true;
      cleanup();

      reject(new Error(`Unable to start yt-dlp: ${error.message}`));
    });

    child.on("close", (code) => {
      if (settled) return;

      settled = true;
      cleanup();

      if (timedOut) {
        reject(new Error("Download timed out."));
        return;
      }

      if (code !== 0) {
        console.error("[yt-dlp]", stderr);

        reject(new Error("yt-dlp failed to download the video."));

        return;
      }

      resolveOutput(stdout.trim());
    });
  });
}

export async function downloadYouTube(
  input: string,
  format: YouTubeDownloadFormat,
  range?: YouTubeTimeRange,
  options: YouTubeDownloadOptions = {},
): Promise<YouTubeDownload> {
  const url = validateYouTubeUrl(input);

  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

  if (!Number.isSafeInteger(maxFileSize) || maxFileSize < 1) {
    throw new Error("Invalid maximum download size.");
  }

  if (
    range &&
    (!Number.isFinite(range.start) ||
      !Number.isFinite(range.end) ||
      range.start < 0 ||
      range.end <= range.start)
  ) {
    throw new Error("Invalid video time range.");
  }

  const directory = await mkdtemp(join(tmpdir(), "cade-youtube-"));

  try {
    const outputTemplate = join(directory, "%(title)s.%(ext)s");

    const args = [
      "--ignore-config",
      "--no-playlist",
      "--no-warnings",
      "--no-progress",
      "--no-simulate",
      "--max-filesize",
      `${Math.max(1, Math.floor(maxFileSize / (1024 * 1024)))}M`,
      "--output",
      outputTemplate,
      "--trim-filenames",
      "180",
    ];

    if (format === "video") {
      args.push(
        "--format",
        "bv*+ba/b",
        "--merge-output-format",
        "mp4",
        "--remux-video",
        "mp4",
      );
    } else {
      args.push(
        "--format",
        "ba/b",
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
      );
    }

    if (range) {
      args.push(
        "--download-sections",
        `*${range.start}-${range.end}`,
        "--force-keyframes-at-cuts",
      );
    }

    args.push("--print", "after_move:filepath", "--", url);

    const output = await executeYtDlp(args);

    const outputPath = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1);

    if (!outputPath) {
      throw new Error("No output file was produced.");
    }

    const finalPath = resolve(outputPath);

    if (dirname(finalPath) !== resolve(directory)) {
      throw new Error("Unexpected download output path.");
    }

    const metadata = await stat(finalPath);

    if (!metadata.isFile() || metadata.size === 0) {
      throw new Error("Downloaded file is empty.");
    }

    if (metadata.size > maxFileSize) {
      throw new Error(
        `File exceeds the configured download limit of ${Math.floor(
          maxFileSize / (1024 * 1024),
        )} MB.`,
      );
    }

    const expectedExtension = format === "video" ? ".mp4" : ".mp3";

    if (extname(finalPath).toLowerCase() !== expectedExtension) {
      throw new Error(`Download did not produce ${expectedExtension}.`);
    }

    return {
      buffer: await readFile(finalPath),
      filename: basename(finalPath),
      format,
    };
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}
