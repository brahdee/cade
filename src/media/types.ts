export type MediaKind = "image" | "video" | "audio";

export interface MediaFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  extension: string;
  kind: MediaKind;
}

export interface ProcessedMedia {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export type MediaSourceType = "attachment" | "reply" | "link" | "embed";

export interface MediaCandidate {
  url: string;
  filename: string;
  source: MediaSourceType;
  size?: number;
}

export interface MediaOptions {
  maxFiles?: number;
  allowedKinds?: MediaKind[];
  allowedMimeTypes?: string[];
}
