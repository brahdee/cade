import sharp from "sharp";
import { parse } from "node:path";

import type { MediaFile, ProcessedMedia } from "./types.js";

const JPEG_QUALITY = 20;
const MAX_OUTPUT_SIZE = 25 * 1024 * 1024;
const MAX_INPUT_PIXELS = 100_000_000;

export async function jpegMedia(media: MediaFile): Promise<ProcessedMedia> {
  if (media.kind !== "image") {
    throw new Error("JPEG requires an image.");
  }

  const metadata = await sharp(media.buffer, {
    animated: true,
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();

  if ((metadata.pages ?? 1) > 1) {
    throw new Error("Animated images are not supported.");
  }

  const buffer = await sharp(media.buffer, {
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .flatten({
      background: "#ffffff",
    })
    .jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true,
    })
    .toBuffer();

  if (buffer.length > MAX_OUTPUT_SIZE) {
    throw new Error("JPEG exceeds the upload limit.");
  }

  const filename =
    parse(media.filename)
      .name.replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60) || "image";

  return {
    buffer,
    filename: `${filename}.jpg`,
    mimeType: "image/jpeg",
  };
}
