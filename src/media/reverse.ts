import sharp from "sharp";

import type { MediaFile, ProcessedMedia } from "./types.js";

import { createOutputFilename, processWithFFmpeg } from "./ffmpeg.js";

const MAX_INPUT_PIXELS = 100_000_000;
const MAX_FRAMES = 500;
const MAX_OUTPUT_SIZE = 25 * 1024 * 1024;

export async function reverseMedia(media: MediaFile): Promise<ProcessedMedia> {
  if (media.mimeType !== "image/gif") {
    throw new Error("Reverse requires an animated GIF.");
  }

  const metadata = await sharp(media.buffer, {
    animated: true,
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();

  const frames = metadata.pages ?? 1;
  const width = metadata.width ?? 0;
  const height = metadata.pageHeight ?? metadata.height ?? 0;

  const totalPixels = width * height * frames;

  if (frames <= 1) {
    throw new Error("The GIF must contain multiple frames.");
  }

  if (frames > MAX_FRAMES || totalPixels > MAX_INPUT_PIXELS) {
    throw new Error("GIF exceeds processing limits.");
  }

  return processWithFFmpeg({
    input: media.buffer,
    inputExtension: media.extension,
    outputExtension: "gif",
    filename: createOutputFilename(media.filename, "reversed", "gif"),
    mimeType: "image/gif",
    maxOutputSize: MAX_OUTPUT_SIZE,
    timeoutMs: 180_000,

    buildArgs: (inputPath, outputPath, maxSize) => {
      const filter =
        "[0:v:0]reverse,split[palette_src][frames];" +
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
    },
  });
}
