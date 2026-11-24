# cade <img src="https://i.imgur.com/y5mZhbK.png" width="100" title="the titular cade" align="right" style="image-rendering: pixelated">

A multi-media TypeScript/Python bot, mainly for friends.

![TypeScript](https://img.shields.io/badge/typescript-black?style=for-the-badge&logo=typescript)
![Python](https://img.shields.io/badge/python-black?style=for-the-badge&logo=python)
![Postgres](https://img.shields.io/badge/postgres-black?style=for-the-badge&logo=postgresql)
![Svelte](https://img.shields.io/badge/svelte-black?style=for-the-badge&logo=svelte)
![FFMPEG](https://img.shields.io/badge/ffmpeg-black?style=for-the-badge&logo=ffmpeg)

---

### This project was recently rewritten from the ground up, in TypeScript!

In an effort to make the project more professional-looking, I decided that starting over in a fresh language and making use of some of the skills I've picked up over the years (with containerization, package management, etc.) was the move.

<strong>Some big changes include:</strong><br>
&bull; Python -> TypeScript (obvious)<br>
&bull; Poetry -> pnpm<br>
&bull; Pillow -> sharp

If you want to look at the previous, Python-focused implementation of cade, [look here!](https://github.com/brahdee/cade/tree/old)

## Features

- **Edit GIFs, images, and videos:** resize, speed up, reverse, and caption (via [pycaption](https://github.com/brahdee/pycaption)) media.

- **Directly download media:** Supports downloading audio/video from Youtube, Instagram, and other sources.

- **Discord support:** the bot can interface through Discord's API! Stream music through voice channels or run commands via a command prefix (.)
  <br><br>

<div align="center">

---

| ✓   | TODO                                                  |
| --- | ----------------------------------------------------- |
| ... | Fix auth error with lavalink (related)                |
| ... | Port over `.imgaudio` and other missing functionality |
| ... | Re-add support for large files                        |

---

<details>
<summary><strong>What does "cade" mean?</strong></summary><blockquote>
Cade is the name of the cat you see pictured everywhere.<br>
<sub>...but Cade is not my cat, and in fact Cade is probably not its real name either - it's a random picture of a cat that my friends found and thought was funny.</sub></blockquote>
</details>
<details>
<summary><strong>What does "for friends" mean?</strong></summary><blockquote>
 I first began working on this when I was about 14, for use with some close friends of mine (but I still tend to work on it from time to time). So, if you want to try running this yourself for whatever reason, please note that this wasn't made with the general public's use in mind!</blockquote>
</details>
<details>
<summary><strong>What's the point of this?</strong></summary><blockquote>You can obviously edit/download media through other means, but this project is special to me as it was my first "big" one (and is also currently the one I've maintained for the longest). Cade played a huge part how I learned to program, and I wouldn't be where I am now if it weren't for this thing.</blockquote>
</details>

---

<img src="https://i.imgur.com/y5mZhbK.png" width="25" title="the titular cade" style="vertical-align: middle; image-rendering: pixelated"> &nbsp; <img src="https://img.shields.io/date/1645760853?style=for-the-badge&labelColor=black&color=black&label=created" style="vertical-align: middle"> &nbsp; <img src="https://i.imgur.com/y5mZhbK.png" width="25" title="the titular cade" style="vertical-align: middle; image-rendering: pixelated">

[MIT License](LICENSE)
</div>
