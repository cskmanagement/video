# Waiting overlay

Animated hourglass inside a clock-style tick ring, for the OBS scene shown while
participants wait to enter the course. Transparent background, seamless 8-second loop,
CSK colours (`#0159a9`, `#01477f`, `#082238`, white).

![Preview](preview.png)

## Use it in OBS

**Browser source (sharpest, recommended).** Add a *Browser* source, tick *Local file*
and choose one of the HTML files. Set width and height to the same value (for example
1080 x 1080) and resize it in the scene as needed. It is vector artwork, so it stays
sharp at any size. Keep all the HTML files in the same folder.

| File | Look |
| --- | --- |
| `waiting-overlay.html` | Blue badge, white artwork |
| `waiting-overlay-white.html` | White badge, blue artwork |
| `waiting-overlay-bare-white.html` | White artwork only, for dark backgrounds |
| `waiting-overlay-bare-blue.html` | Blue artwork only, for light backgrounds |

**Media source (video file).** Add a *Media Source*, choose one of the WebM files and
tick *Loop*. The files are VP9 with an alpha channel at 60 fps.

| File | Size |
| --- | --- |
| `waiting-overlay-blue-2160.webm` | 2160 x 2160 |
| `waiting-overlay-blue-1080.webm` | 1080 x 1080 |
| `waiting-overlay-white-2160.webm` | 2160 x 2160 |
| `waiting-overlay-white-1080.webm` | 1080 x 1080 |

## Change it

Timing, proportions and colours are constants at the top of the script and style blocks
in `waiting-overlay.html`. To rebuild the video files after a change:

```bash
npm install playwright
```

```bash
node render.cjs
```

This needs `ffmpeg` with `libvpx-vp9` on the path.
