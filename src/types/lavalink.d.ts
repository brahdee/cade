import "lavalink-client";

declare module "lavalink-client" {
  interface TrackRequester {
    id: string;
    username: string;
  }
}
