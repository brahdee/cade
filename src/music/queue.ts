import type { CadePlayer } from "./player.js";

export type CadeQueueTrack = CadePlayer["queue"]["tracks"][number];

const SKIP_QUEUE_CACHE = "skipQueueCache";

/**
 * Gets the playlist name attached to a queued track.
 */
export function getTrackPlaylistName(track: CadeQueueTrack): string | null {
  const userData = (
    track as unknown as {
      userData?: Record<string, unknown>;
    }
  ).userData;

  const playlistName = userData?.playlistName;

  return typeof playlistName === "string" && playlistName.trim()
    ? playlistName
    : null;
}

/**
 * Gets a readable track title.
 */
export function getQueueTrackTitle(track: CadeQueueTrack): string {
  return track.info?.title ?? "Unknown track";
}

/**
 * Saves the upcoming queue so `.skip undo` can restore it.
 */
export function saveQueueSnapshot(player: CadePlayer): void {
  player.setData(SKIP_QUEUE_CACHE, [...player.queue.tracks]);
}

/**
 * Restores a previously saved upcoming queue.
 */
export async function restoreQueueSnapshot(
  player: CadePlayer,
): Promise<boolean> {
  const cachedTracks = player.getData<CadeQueueTrack[]>(SKIP_QUEUE_CACHE);

  if (!cachedTracks) {
    return false;
  }

  const currentLength = player.queue.tracks.length;

  if (currentLength > 0) {
    await player.queue.splice(0, currentLength, cachedTracks);
  } else if (cachedTracks.length > 0) {
    await player.queue.add(cachedTracks);
  }

  player.deleteData(SKIP_QUEUE_CACHE);

  return true;
}

/**
 * Selects one random upcoming track and moves it to the front.
 *
 * The relative order of all other upcoming tracks is preserved.
 */
export async function prepareShuffledNextTrack(
  player: CadePlayer,
): Promise<void> {
  if (player.getData<boolean>("shuffleMode") !== true) {
    return;
  }

  const tracks = player.queue.tracks;

  if (tracks.length < 2) {
    return;
  }

  const selectedIndex = Math.floor(Math.random() * tracks.length);

  if (selectedIndex === 0) {
    return;
  }

  const reorderedTracks = [
    tracks[selectedIndex],
    ...tracks.slice(0, selectedIndex),
    ...tracks.slice(selectedIndex + 1),
  ];

  await player.queue.splice(0, tracks.length, reorderedTracks);
}

/**
 * Handles shuffle selection and loop counting when a track starts.
 */
export async function handleTrackStartQueueModes(
  player: CadePlayer,
): Promise<void> {
  const currentTrack = player.queue.current;

  if (!currentTrack) {
    return;
  }

  if (player.repeatMode === "track") {
    const identifier = currentTrack.info.identifier;
    const previousIdentifier = player.getData<string>("loopTrackIdentifier");

    if (previousIdentifier === identifier) {
      const loopCount = player.getData<number>("loopCount") ?? 0;

      player.setData("loopCount", loopCount + 1);
    } else {
      player.setData("loopTrackIdentifier", identifier);
      player.setData("loopCount", 0);
    }
  }

  await prepareShuffledNextTrack(player);
}
