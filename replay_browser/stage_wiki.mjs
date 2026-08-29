#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const wikiRoot = path.resolve(process.argv[2] ?? "");
if (!wikiRoot || !fs.existsSync(path.join(wikiRoot, "assets", "site.css"))) {
  throw new Error("usage: stage_wiki.mjs /path/to/yxp_wiki");
}

const assetRoot = path.join(wikiRoot, "assets", "recordings");
const assetVersion = "20260829-recording-format-01";
fs.mkdirSync(assetRoot, { recursive: true });
if (!process.env.YXP_SKIP_STAGE_DATA) {
  const stagedDataRoot = path.join(assetRoot, "data");
  fs.rmSync(stagedDataRoot, { recursive: true, force: true });
  fs.cpSync(path.join(here, "data"), stagedDataRoot, { recursive: true, force: true });
}
fs.copyFileSync(path.join(here, "replay-browser.css"), path.join(assetRoot, "replay-browser.css"));
fs.copyFileSync(path.join(here, "recording-codec.cjs"), path.join(assetRoot, "recording-codec.js"));
fs.copyFileSync(path.join(here, "replay-browser.js"), path.join(assetRoot, "replay-browser.js"));

function stageImageDirectory(sourceName, destinationName) {
  const source = path.join(here, sourceName);
  const destination = path.join(assetRoot, destinationName);
  if (fs.existsSync(source)) {
    fs.cpSync(source, destination, { recursive: true, force: true });
    return;
  }
  // These directories are deployment assets, not products of the recording
  // data build.  A source checkout without extraction helpers must preserve the
  // already-deployed copies instead of deleting them or failing the stage.
  if (!fs.existsSync(destination)) {
    throw new Error(`missing recording image directory ${source} and no deployed ${destination}`);
  }
}

stageImageDirectory("buff-icons", "buffs");
stageImageDirectory("emoji-images", "emojis");
stageImageDirectory("special-card-art", "special-cards");

const baseHtml = fs.readFileSync(path.join(here, "index.html"), "utf8")
  .replace('href="wiki-site.css"', 'href="/yxp_wiki/assets/site.css"')
  .replace('href="replay-browser.css"', `href="/yxp_wiki/assets/recordings/replay-browser.css?v=${assetVersion}"`)
  .replace('data-asset-mode="local" data-recording-base="data"', `data-asset-mode="wiki" data-recording-base="/yxp_wiki/assets/recordings/data" data-recording-version="${assetVersion}"`)
  .replace('src="recording-codec.js"', `src="/yxp_wiki/assets/recordings/recording-codec.js?v=${assetVersion}"`)
  .replace('src="replay-browser.js"', `src="/yxp_wiki/assets/recordings/replay-browser.js?v=${assetVersion}"`);

const englishHtml = baseHtml
  .replaceAll('https://sharpobject.github.io/yxp_wiki/en/', '/yxp_wiki/en/')
  .replace('<a class="lang" href="#">中文</a>', '<a class="lang" href="/yxp_wiki/zh/recordings/">中文</a>');

const chineseHtml = baseHtml
  .replace('<html lang="en">', '<html lang="zh-CN">')
  .replace('<title>Match Recordings - Yi Xian Wiki</title>', '<title>对局录像 - 弈仙牌 Wiki</title>')
  .replaceAll('https://sharpobject.github.io/yxp_wiki/en/', '/yxp_wiki/zh/')
  .replaceAll('/yxp_wiki/en/', '/yxp_wiki/zh/')
  .replace('Yi Xian Wiki</a>', '弈仙牌 Wiki</a>')
  .replace('Characters</a>', '角色</a>')
  .replace('Cards</a>', '卡牌</a>')
  .replace('Sigils</a>', '刻印</a>')
  .replace('Fates</a>', '仙命</a>')
  .replace('Recordings</a>', '录像</a>')
  .replace('<a class="lang" href="/yxp_wiki/zh/recordings/">中文</a>', '<a class="lang" href="/yxp_wiki/en/recordings/">English</a>')
  .replace('Match recording archive', '对局录像库')
  .replace('<h1>Match recordings</h1>', '<h1>对局录像</h1>')
  .replace('Browse a recorded player’s actions and the prior-round information available about the rest of the lobby.', '浏览已记录玩家的操作，以及大厅中其他玩家上一轮的公开信息。')
  .replace('>Recording\n', '>录像\n')
  .replace('aria-label="Choose a recording"', 'aria-label="选择录像"')
  .replace('aria-label="Filter recordings"', 'aria-label="筛选录像"')
  .replace('aria-label="Previous action"', 'aria-label="上一步"')
  .replace('aria-label="Next action"', 'aria-label="下一步"')
  .replace('aria-label="Recording timeline"', 'aria-label="录像时间线"')
  .replace('aria-label="Jump to round"', 'aria-label="跳转到轮次"')
  .replaceAll('Loading…', '载入中…')
  .replace('Loading recording…', '正在载入录像…')
  .replace('aria-label="Players; select one to inspect"', 'aria-label="玩家；选择以查看"')
  .replace('At this point', '当前节点')
  .replace('<h2>Recent actions</h2>', '<h2>最近操作</h2>');

for (const [language, html] of [["en", englishHtml], ["zh", chineseHtml]]) {
  const pageRoot = path.join(wikiRoot, language, "recordings");
  fs.mkdirSync(pageRoot, { recursive: true });
  fs.writeFileSync(path.join(pageRoot, "index.html"), html);
}

console.log(`staged localized recording browser at ${assetRoot}, ${path.join(wikiRoot, "en", "recordings")}, and ${path.join(wikiRoot, "zh", "recordings")}`);
