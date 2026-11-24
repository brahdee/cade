import type { MediaFile, ProcessedMedia } from "./types.js";

import { createOutputFilename, processWithFFmpeg } from "./ffmpeg.js";

export const DEFAULT_SPEED = 1.25;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;

const MAX_OUTPUT_SIZE = 25 * 1024 * 1024;

function createAtempoFilter(multiplier: number): string {
  let remaining = multiplier;

  const filters: string[] = [];

  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }

  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }

  filters.push(`atempo=${Number(remaining.toFixed(6))}`);

  return filters.join(",");
}

export async function speedMedia(
  media: MediaFile,
  multiplier: number,
): Promise<ProcessedMedia> {
  if (
    !Number.isFinite(multiplier) ||
    multiplier < MIN_SPEED ||
    multiplier > MAX_SPEED
  ) {
    throw new Error("Invalid speed multiplier.");
  }

  const isGif = media.mimeType === "image/gif";

  if (!isGif && media.kind !== "video") {
    throw new Error("Speed requires a GIF or video.");
  }

  const speed = Number(multiplier.toFixed(6));

  const extension = isGif ? "gif" : "mp4";

  return processWithFFmpeg({
    input: media.buffer,
    inputExtension: media.extension,
    outputExtension: extension,
    filename: createOutputFilename(media.filename, "speed", extension),
    mimeType: isGif ? "image/gif" : "video/mp4",
    maxOutputSize: MAX_OUTPUT_SIZE,
    timeoutMs: 180_000,

    buildArgs: (inputPath, outputPath, maxSize) => {
      if (isGif) {
        const filter =
          `[0:v:0]setpts=PTS/${speed},` +
          "split[palette_src][frames];" +
          "[palette_src]palettegen=reserve_transparent=1[palette];" +
          "[frames][palette]paletteuse[out]";

        return [
          "-i",
          inputPath,
          "-filter_complex",
          filter,
          "-map",
          "[out]",
          "-an",
          "-vsync",
          "0",
          "-loop",
          "0",
          "-threads",
          "2",
          "-fs",
          String(maxSize),
          outputPath,
        ];
      }

      return [
        "-i",
        inputPath,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-vf",
        `setpts=PTS/${speed}`,
        "-af",
        createAtempoFilter(speed),
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
        "-movflags",
        "+faststart",
        "-threads",
        "2",
        "-fs",
        String(maxSize),
        outputPath,
      ];
    },
  });
}
