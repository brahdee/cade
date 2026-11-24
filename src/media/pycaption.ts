import { spawn } from "node:child_process";

import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";
import { join, parse, resolve } from "node:path";

import sharp from "sharp";

import type { MediaFile, ProcessedMedia } from "./types.js";

export type CaptionOperation = "caption" | "uncaption";

const MAX_INPUT_SIZE = 25 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 25 * 1024 * 1024;

const MAX_INPUT_PIXELS = 50_000_000;
const MAX_FRAMES = 250;
const MAX_DIMENSION = 8192;

const PROCESS_TIMEOUT = 5 * 60 * 1000;

const SUPPORTED_FORMATS = new Set([
  "image/gif",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function createFilename(original: string, operation: CaptionOperation): string {
  const name =
    parse(original)
      .name.replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60) || "image";

  return `${name}-${operation === "caption" ? "captioned" : "uncaptioned"}.gif`;
}

async function prepareInput(media: MediaFile): Promise<Buffer> {
  if (media.kind !== "image" || !SUPPORTED_FORMATS.has(media.mimeType)) {
    throw new Error("Unsupported media format.");
  }

  if (media.buffer.length > MAX_INPUT_SIZE) {
    throw new Error("Input exceeds the upload limit.");
  }

  const image = sharp(media.buffer, {
    animated: true,
    limitInputPixels: MAX_INPUT_PIXELS,
  });

  const metadata = await image.metadata();

  const width = metadata.width ?? 0;
  const height = metadata.pageHeight ?? metadata.height ?? 0;
  const frames = metadata.pages ?? 1;

  if (
    width < 24 ||
    height < 1 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    frames > MAX_FRAMES ||
    width * height * frames > MAX_INPUT_PIXELS
  ) {
    throw new Error("Media exceeds processing limits.");
  }

  if (media.mimeType === "image/gif" && frames > 1) {
    return media.buffer;
  }

  const normalized = await sharp(media.buffer, {
    animated: true,
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .gif({
      delay: metadata.delay ?? 100,
      loop: metadata.loop ?? 0,
    })
    .toBuffer();

  if (normalized.length > MAX_INPUT_SIZE) {
    throw new Error("Normalized image exceeds the upload limit.");
  }

  return normalized;
}

function runPyCaption(args: string[], workingDirectory: string): Promise<void> {
  return new Promise((resolveProcess, reject) => {
    const child = spawn(process.env.PYTHON_BIN ?? "python3", args, {
      cwd: workingDirectory,
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
    }, PROCESS_TIMEOUT);

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
        resolveProcess();
      }
    };

    child.stderr.setEncoding("utf8");

    child.stderr.on("data", (chunk) => {
      stderr += chunk;

      if (stderr.length > 16_384) {
        stderr = stderr.slice(-16_384);
      }
    });

    child.once("error", (error) => {
      finish(new Error(`Could not start pycaption: ${error.message}`));
    });

    child.once("close", (code) => {
      if (timedOut) {
        finish(new Error("Caption processing timed out."));
        return;
      }

      if (code !== 0) {
        console.error("[pycaption]", stderr);

        finish(new Error("pycaption processing failed."));

        return;
      }

      finish();
    });
  });
}

export async function processCaption(
  media: MediaFile,
  operation: CaptionOperation,
  caption?: string,
): Promise<ProcessedMedia> {
  const inputBuffer = await prepareInput(media);

  if (operation === "caption" && (!caption || caption.trim().length === 0)) {
    throw new Error("Caption text is required.");
  }

  if (caption && caption.length > 500) {
    throw new Error("Caption is too long.");
  }

  const projectDirectory = resolve(
    process.env.PYCAPTION_DIR ?? "/opt/pycaption",
  );

  const scriptPath = join(projectDirectory, "pycaption");

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "cade-caption-"));

  const inputPath = join(temporaryDirectory, "input.gif");

  const outputPath = join(temporaryDirectory, "output.gif");

  try {
    await writeFile(inputPath, inputBuffer);

    const args = [scriptPath, "--input", inputPath, "--output", outputPath];

    if (operation === "caption") {
      args.push(`--caption=${caption}`);
    } else {
      args.push("--uncaption");
    }

    await runPyCaption(args, projectDirectory);

    const metadata = await stat(outputPath);

    if (
      !metadata.isFile() ||
      metadata.size === 0 ||
      metadata.size > MAX_OUTPUT_SIZE
    ) {
      throw new Error("Invalid caption output.");
    }

    const buffer = await readFile(outputPath);

    const header = buffer.subarray(0, 6).toString("ascii");

    if (header !== "GIF87a" && header !== "GIF89a") {
      throw new Error("Invalid GIF output.");
    }

    return {
      buffer,
      filename: createFilename(media.filename, operation),
      mimeType: "image/gif",
    };
  } finally {
    await rm(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
}
