import type { CadeCommand } from "../commands/types";

const ERROR_EMOJI = "<a:fire:1004208282585530408>";
const SUCCESS_EMOJI = "<:cadeok:934934539124502598>";
const PROCESSING_EMOJI = "<a:cadeload:934934660495048716>";

type NestedMessages = {
  [key: string]: string | NestedMessages;
};

function withPrefix<const T extends NestedMessages>(
  entries: T,
  prefix: string,
): {
    [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends NestedMessages
    ? ReturnType<typeof withPrefix<T[K]>>
    : never;
  } {
  return Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [
      key,
      typeof value === "string"
        ? `${prefix} ${value}`
        : withPrefix(value, prefix),
    ]),
  ) as any;
}

export const messages = {
  errors: withPrefix(
    {
      tag: {
        notFound: "that tag has not been created yet",
        alreadyExists: "that tag already exists",
        noneCreated: "no tags have been made yet",
        missingName: "please provide a tag name",
        contentTooLong: "tag content cannot exceed 2000 characters",
      },
      get: {
        failed: "couldn't download the requested media",
        expired: "this .get request has expired. please try again.",
        invalidTime: "invalid time range",
        invalidUrl: "please provide a valid YouTube URL",
        invalidUsage: "usage: .get <youtube-url> [start-time end-time]",
      },
      resize: {
        invalidUsage: "usage: .resize <width|auto> [height|auto]",
        invalidDimensions: "please provide valid dimensions (2 to 4096)",
        noMedia: "please attach or reply to an image, gif, or video",
        failed: "couldn't resize the requested media",
      },
      jpeg: {
        invalidUsage: "usage: .jpeg (image)",
        noMedia: "please attach or reply to an image",
        failed: "couldn't compress the requested image",
      },
      speed: {
        invalidUsage: "usage: .speed [multiplier] (gif/video)",
        invalidMultiplier: "please provide a multiplier between 0.25 and 4",
        noMedia: "please attach or reply to a gif or video",
        failed: "couldn't change the speed of the requested media",
      },
      reverse: {
        invalidUsage: "usage: .reverse (gif)",
        noMedia: "please attach or reply to an animated gif",
        failed: "couldn't reverse the requested gif",
      },
      caption: {
        invalidUsage: "usage: .caption <text>",
        missingText: "please provide caption text",
        tooLong: "caption must be 500 characters or less",
        noMedia: "please attach or reply to an image or gif",
        failed: "couldn't caption the requested media",
      },
      uncaption: {
        invalidUsage: "usage: .uncaption",
        noMedia: "please attach or reply to a captioned image or gif",
        failed: "couldn't remove the caption from the requested media",
      },
      help: {
        notFound: "command not found",
      },
      info: {
        notFound: "command not found",
      },
      setprefix: {
        noPermission: "you need administrator permissions to use this command",
        tooLong: "invalid prefix. prefixes cannot exceed 3 characters",
      },
      welcome: {
        noPermission: "you need administrator permissions to use this command",
        invalidUsage: "usage: `.welcome #channel *[message]`",
        invalidChannel: "please provide a valid text channel",
        tooLong: "welcome message cannot exceed 2000 characters",
      },
      player: {
        notConnected: "i'm not connected to a vc",
        invokerNotConnected: "you need to be in a vc",
        noPermission: "no permission to connect or speak in that vc :(",
        notSameVC: "you need to be in the same vc as me!",
        notPlaying: "nothing is currently playing",
        alreadyConnectedToAnotherVC: "i'm already connected to another vc",
      },
      disconnect: {
        failed: "something went wrong while disconnecting",
      },
      join: {
        failed: "something went wrong while joining the vc",
      },
      lyrics: {
        notFound: "couldn't find lyrics for this track",
        failed: "failed to retrieve lyrics",
      },
      pause: {
        failed: "something went wrong while trying to pause/unpause",
      },
      play: {
        noQuery: "please provide a song name or URL",
        noTracksFound: "no tracks found",
        failed: "something went wrong while loading that track",
      },
      queue: {
        empty: "there's nothing in the queue",
        onlyInvoker:
          "only the person who ran this command can use these buttons",
      },
      seek: {
        notSeekable: "this track cannot be seeked",
        invalidUsage:
          "usage: `.seek [time]`\nexamples: `.seek 90`, `.seek 1:30`, `.seek 1:02:15`",
        invalidTimestamp:
          "invalid timestamp. use seconds, `m:ss`, or `h:mm:ss`",
      },
      shuffle: {
        empty: "the queue is empty!",
      },
      skip: {
        invalidUsage: "usage: `.skip [index]/all/[track name]`",
        noQueueHistory: "there's no queue change to undo",
        trackNotInQueue: "that track isn't in the queue",
      },
    },
    ERROR_EMOJI,
  ),

  success: withPrefix(
    {
      tag: {
        added: "added tag",
        removed: "removed tag",
      },
      setprefix: {
        updated: "updated the server prefix",
      },
      welcome: {
        disabled: "disabled the welcome message",
        updated: "updated the welcome message and channel",
      },
      loop: {
        enabled: "started looping track",
        disabled: "stopped looping track",
      },
      pause: {
        paused: "paused",
        resumed: "unpaused",
      },
      play: {
        addedToQueue: "added to the queue",
      },
      queue: {
        cleared: "cleared the queue",
      },
      shuffle: {
        enabled: "picking a random song from now on",
        disabled: "playing the queue in order from now on",
      },
      skip: {
        trackSkipped: "track skipped",
        playlistSkipped: "playlist skipped",
      },
    },
    SUCCESS_EMOJI,
  ),

  processing: withPrefix(
    {
      resize: "resizing media...",
      jpeg: "compressing image...",
      speed: "changing media speed...",
      reverse: "reversing gif...",
      caption: "adding caption...",
      uncaption: "removing caption...",
    },
    PROCESSING_EMOJI,
  ),

  media: {
    get: {
      chooseFormat: `${PROCESSING_EMOJI} whatcha wanna download`,

      onlyInvoker: `${ERROR_EMOJI} only the person who used .get can use these buttons`,

      downloading: (format: "video" | "audio") => `${PROCESSING_EMOJI} downloading ${format}...`,
    },
  },
} as const;

export async function reactSuccess(
  message: Parameters<CadeCommand["execute"]>[0]["message"],
): Promise<void> {
  await message.react(SUCCESS_EMOJI).catch(() => undefined);
}
