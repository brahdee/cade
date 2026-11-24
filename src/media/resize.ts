import sharp from "sharp";

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";
import { basename, join, parse } from "node:path";

import type { MediaFile } from "./types.js";

export interface ResizeDimensions {
  width?: number;
  height?: number;
}

export interface ResizedMedia {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

const MAX_DIMENSION = 8192;
const MAX_INPUT_PIXELS = 100_000_000;
const MAX_OUTPUT_SIZE = 25 * 1024 * 1024;
const FFMPEG_TIMEOUT = 180_000;

function getOutputFilename(original: string, extension: string): string {
  const name = parse(basename(original))
    .name.replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);

  return `${name || "media"}-resized.${extension}`;
}

function validateDimensions(dimensions: ResizeDimensions): void {
  const { width, height } = dimensions;

  if (width === undefined && height === undefined) {
    throw new Error("At least one dimension is required.");
  }

  for (const dimension of [width, height]) {
    if (dimension === undefined) continue;

    if (
      !Number.isInteger(dimension) ||
      dimension < 2 ||
      dimension > MAX_DIMENSION
    ) {
      throw new Error(`Dimensions must be between 2 and ${MAX_DIMENSION}.`);
    }
  }
}

async function resizeImage(
  media: MediaFile,
  dimensions: ResizeDimensions,
): Promise<ResizedMedia> {
  const image = sharp(media.buffer, {
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: dimensions.width,
      height: dimensions.height,
      fit: "fill",
    });

  let buffer: Buffer;
  let extension: string;
  let mimeType: string;

  switch (media.mimeType) {
    case "image/jpeg":
      buffer = await image.jpeg().toBuffer();
      extension = "jpg";
      mimeType = "image/jpeg";
      break;

    case "image/png":
      buffer = await image.png().toBuffer();
      extension = "png";
      mimeType = "image/png";
      break;

    case "image/webp":
      buffer = await image.webp().toBuffer();
      extension = "webp";
      mimeType = "image/webp";
      break;

    case "image/avif":
      buffer = await image.avif().toBuffer();
      extension = "avif";
      mimeType = "image/avif";
      break;

    default:
      throw new Error(`Unsupported image format: ${media.mimeType}`);
  }

  if (buffer.length > MAX_OUTPUT_SIZE) {
    throw new Error("Resized media exceeds the upload limit.");
  }

  return {
    buffer,
    filename: getOutputFilename(media.filename, extension),
    mimeType,
  };
}

function executeFFmpeg(args: string[]): Promise<void> {
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
    }, FFMPEG_TIMEOUT);

    function cleanup(): void {
      clearTimeout(timeout);

      if (forceKill) {
        clearTimeout(forceKill);
      }
    }

    child.stderr.setEncoding("utf8");

    child.stderr.on("data", (chunk) => {
      stderr += chunk;

      if (stderr.length > 16_384) {
        stderr = stderr.slice(-16_384);
      }
    });

    child.once("error", (error) => {
      if (settled) return;

      settled = true;
      cleanup();

      reject(new Error(`Unable to start FFmpeg: ${error.message}`));
    });

    child.once("close", (code) => {
      if (settled) return;

      settled = true;
      cleanup();

      if (timedOut) {
        reject(new Error("Media processing timed out."));
        return;
      }

      if (code !== 0) {
        console.error("[FFmpeg]", stderr);

        reject(new Error("FFmpeg failed to resize media."));
        return;
      }

      resolve();
    });
  });
}

async function resizeAnimatedMedia(
  media: MediaFile,
  dimensions: ResizeDimensions,
): Promise<ResizedMedia> {
  const directory = await mkdtemp(join(tmpdir(), "cade-resize-"));

  const inputExtension = media.extension.replace(/[^a-zA-Z0-9]/g, "");

  const inputPath = join(directory, `input.${inputExtension}`);

  const isGif = media.mimeType === "image/gif";

  const outputExtension = isGif ? "gif" : "mp4";
  const outputPath = join(directory, `output.${outputExtension}`);

  try {
    await writeFile(inputPath, media.buffer);

    const width = dimensions.width ?? -2;
    const height = dimensions.height ?? -2;

    const scaleFilter = `scale=${width}:${height}:flags=lanczos`;

    const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", inputPath];

    if (isGif) {
      const filter =
        `[0:v:0]${scaleFilter},split[a][b];` +
        "[a]palettegen=reserve_transparent=1[p];" +
        "[b][p]paletteuse[out]";

      args.push(
        "-filter_complex",
        filter,
        "-map",
        "[out]",
        "-an",
        "-loop",
        "0",
        "-threads",
        "2",
        "-f",
        "gif",
        outputPath,
      );
    } else {
      args.push(
        "-vf",
        scaleFilter,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-threads",
        "2",
        "-movflags",
        "+faststart",
        outputPath,
      );
    }

    await executeFFmpeg(args);

    const metadata = await stat(outputPath);

    if (!metadata.isFile() || metadata.size === 0) {
      throw new Error("Resized media is empty.");
    }

    if (metadata.size > MAX_OUTPUT_SIZE) {
      throw new Error("Resized media exceeds the upload limit.");
    }

    return {
      buffer: await readFile(outputPath),
      filename: getOutputFilename(media.filename, outputExtension),
      mimeType: isGif ? "image/gif" : "video/mp4",
    };
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

export async function resizeMedia(
  media: MediaFile,
  dimensions: ResizeDimensions,
): Promise<ResizedMedia> {
  validateDimensions(dimensions);

  if (media.kind === "video" || media.mimeType === "image/gif") {
    return resizeAnimatedMedia(media, dimensions);
  }

  return resizeImage(media, dimensions);
}
