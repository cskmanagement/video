#!/usr/bin/env node
/*
 * Renders waiting-overlay.html to looping WebM files with a transparent
 * background (VP9 + alpha), for use as an OBS Media Source.
 *
 * Needs node with the `playwright` package (Chromium) and ffmpeg with libvpx-vp9.
 *
 *   node render.cjs                 all themes and sizes
 *   node render.cjs blue 1080       one theme / one size
 */
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const FPS = 60;
const THEMES = ['blue', 'white'];
const SIZES = [2160, 1080];
const LAYOUT = 1080; // CSS pixels; larger sizes are rendered at a higher device scale
const WORKERS = Math.max(1, Math.min(4, os.cpus().length));
const SOURCE = path.join(__dirname, 'waiting-overlay.html');

async function capture(browser, theme, size, dir) {
  const url = `${pathToFileURL(SOURCE).href}?theme=${theme}#capture`;
  const pages = await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      const page = await browser.newPage({
        viewport: { width: LAYOUT, height: LAYOUT },
        deviceScaleFactor: size / LAYOUT,
      });
      page.on('pageerror', (error) => { throw error; });
      await page.goto(url);
      return page;
    })
  );
  const frames = Math.round((await pages[0].evaluate(() => window.overlay.loop)) * FPS);
  let next = 0;
  await Promise.all(
    pages.map(async (page) => {
      for (let i = next++; i < frames; i = next++) {
        await page.evaluate((t) => window.overlay.render(t), i / FPS);
        await page.screenshot({
          path: path.join(dir, `f_${String(i).padStart(5, '0')}.png`),
          omitBackground: true,
        });
      }
    })
  );
  await Promise.all(pages.map((page) => page.close()));
  return frames;
}

function encode(dir, out) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', path.join(dir, 'f_%05d.png'),
      // Explicit BT.709 conversion and tagging so the brand colours survive decoding.
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuva420p',
      '-c:v', 'libvpx-vp9', '-crf', '18', '-b:v', '0',
      '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1',
      '-auto-alt-ref', '0', '-g', String(FPS * 2),
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      out,
    ],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${out}`);
}

(async () => {
  const args = process.argv.slice(2);
  const themes = THEMES.filter((theme) => !args.some((a) => THEMES.includes(a)) || args.includes(theme));
  const sizes = SIZES.filter((size) => !args.some((a) => SIZES.includes(+a)) || args.includes(String(size)));

  const browser = await chromium.launch();
  try {
    for (const theme of themes) {
      for (const size of sizes) {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waiting-overlay-'));
        const out = path.join(__dirname, `waiting-overlay-${theme}-${size}.webm`);
        const started = Date.now();
        const frames = await capture(browser, theme, size, dir);
        encode(dir, out);
        if (process.env.KEEP_FRAMES) console.log(`frames kept in ${dir}`);
        else fs.rmSync(dir, { recursive: true, force: true });
        const mb = (fs.statSync(out).size / 1e6).toFixed(1);
        console.log(`${path.basename(out)}: ${frames} frames, ${mb} MB, ${Math.round((Date.now() - started) / 1000)} s`);
      }
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
