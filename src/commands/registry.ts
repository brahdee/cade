import type { CadeCommand } from "./types.js";

import { HelpCommand } from "./misc/help.js";
import { InfoCommand } from "./misc/info.js";

import { TagCommand } from "./misc/tag.js";
import { TagDeleteCommand } from "./misc/tagdelete.js";
import { TagListCommand } from "./misc/taglist.js";

import { SetPrefixCommand } from "./misc/setprefix.js";
import { WelcomeCommand } from "./misc/welcome.js";

import { JoinCommand } from "./music/join.js";
import { PlayCommand } from "./music/play.js";
import { DisconnectCommand } from "./music/disconnect.js";
import { PauseCommand } from "./music/pause.js";
import { NowPlayingCommand } from "./music/nowplaying.js";
import { QueueCommand } from "./music/queue.js";
import { SkipCommand } from "./music/skip.js";
import { LoopCommand } from "./music/loop.js";
import { ShuffleCommand } from "./music/shuffle.js";
import { LoopCountCommand } from "./music/loopcount.js";
import { SeekCommand } from "./music/seek.js";
import { LyricsCommand } from "./music/lyrics.js";

import { GetCommand } from "./media/get.js";
import { ResizeCommand } from "./media/resize.js";
import { JpegCommand } from "./media/jpeg.js";
import { SpeedCommand } from "./media/speed.js";
import { ReverseCommand } from "./media/reverse.js";
import { CaptionCommand } from "./media/caption.js";
import { UncaptionCommand } from "./media/uncaption.js";

export const commands: CadeCommand[] = [
  new HelpCommand(),
  new InfoCommand(),
  new TagCommand(),
  new TagDeleteCommand(),
  new TagListCommand(),
  new SetPrefixCommand(),
  new WelcomeCommand(),

  new JoinCommand(),
  new PlayCommand(),
  new DisconnectCommand(),
  new PauseCommand(),
  new NowPlayingCommand(),
  new QueueCommand(),
  new SkipCommand(),
  new LoopCommand(),
  new ShuffleCommand(),
  new LoopCountCommand(),
  new SeekCommand(),
  new LyricsCommand(),

  new GetCommand(),
  new ResizeCommand(),
  new JpegCommand(),
  new SpeedCommand(),
  new ReverseCommand(),
  new CaptionCommand(),
  new UncaptionCommand(),
];
