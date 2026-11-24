import { spawn } from "node:child_process";

import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";
import { join, parse } from "node:path";

import type { ProcessedMedia } from "./types.js";

export const MAX_OUTPUT_SIZE = 25 * 1024 * 1024;

interface FFmpegOptions {
  input: Buffer;
  inputExtension: string;
  outputExtension: string;
  filename: string;
  mimeType: string;

  buildArgs: (
    inputPath: string,
    outputPath: string,
    maxOutputSize: number,
  ) => string[];

  maxOutputSize?: number;
  timeoutMs?: number;
}

export function createOutputFilename(
  original: string,
  suffix: string,
  extension: string,
): string {
  const base =
    parse(original)
      .name.replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60) || "media";
  return `${base}-${suffix}.${extension}`;
}

function runFFmpeg(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    let settled = false;
    let timedOut = false;

    let forceKill: ReturnType<typeof setTimeout> | undefined;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");

      forceKill = setTimeout(() => {
        child.kill("SIGKILL");
      }, 5000);

      forceKill.unref();
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);

      if (forceKill) {
        clearTimeout(forceKill);
      }
    };

    const finish = (error?: Error) => {
      if (settled) return;

      settled = true;
      cleanup();

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    child.stderr?.setEncoding("utf8");

    child.stderr?.on("data", (chunk) => {
      stderr += chunk;

      if (stderr.length > 20_000) {
        stderr = stderr.slice(-20_000);
      }
    });

    child.once("error", (error) => {
      finish(new Error(`Could not start FFmpeg: ${error.message}`));
    });

    child.once("close", (code) => {
      if (timedOut) {
        finish(new Error("Media processing timed out."));
        return;
      }

      if (code !== 0) {
        finish(new Error(stderr.trim() || "FFmpeg processing failed."));

        return;
      }

      finish();
    });
  });
}

export async function processWithFFmpeg(
  options: FFmpegOptions,
): Promise<ProcessedMedia> {
  const directory = await mkdtemp(join(tmpdir(), "cade-ffmpeg-"));

  const inputExtension = options.inputExtension.replace(/[^a-zA-Z0-9]/g, "");

  const outputExtension = options.outputExtension.replace(/[^a-zA-Z0-9]/g, "");

  if (!inputExtension || !outputExtension) {
    await rm(directory, { recursive: true, force: true });
    throw new Error("Invalid media extension.");
  }

  const inputPath = join(directory, `input.${inputExtension}`);

  const outputPath = join(directory, `output.${outputExtension}`);

  const maxOutputSize = options.maxOutputSize ?? MAX_OUTPUT_SIZE;

  try {
    await writeFile(inputPath, options.input);

    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-y",
      ...options.buildArgs(inputPath, outputPath, maxOutputSize),
    ];

    await runFFmpeg(args, options.timeoutMs ?? 180_000);

    const metadata = await stat(outputPath);

    if (!metadata.isFile() || metadata.size === 0) {
      throw new Error("FFmpeg produced an empty file.");
    }

    if (metadata.size > maxOutputSize) {
      throw new Error("Output exceeds the upload limit.");
    }

    return {
      buffer: await readFile(outputPath),
      filename: options.filename,
      mimeType: options.mimeType,
    };
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}
