// Spell check for everything a post shows or says: on-screen text and every
// caption. Runs hunspell (Node 2 has the Bulgarian and English dictionaries);
// Cyrillic words are checked against bg_BG, Latin ones against en_US. Words a
// dictionary cannot know - brand names, slang, sign mythology - go in
// content/spell-allow.txt, one per line, so every exception is a reviewed
// decision rather than a silent skip.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function postTexts(post) {
  const texts = [post.hook?.text, post.hook?.kicker, post.hook?.say, post.outro?.text, post.outro?.sub, post.outro?.say, post.listTitle];
  for (const scene of post.scenes || []) {
    texts.push(scene.text, scene.kicker, scene.title, scene.prompt, scene.left, scene.right, scene.a, scene.b, scene.say, scene.child);
    for (const item of scene.items || []) texts.push(typeof item === 'string' ? item : item.text);
    for (const message of scene.messages || []) texts.push(message.text);
  }
  const caption = post.caption || {};
  texts.push(caption.tiktok, caption.instagram, caption.pinterest?.title, caption.pinterest?.description);
  return texts.filter((text) => typeof text === 'string' && text.trim());
}

export function words(text) {
  return String(text)
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')          // hashtags are not prose
    .replace(/https?:\/\/\S+|\S+\.(store|com|bg)\b/gu, ' ')
    .replace(/\*/g, '')
    .split(/[^\p{L}'’-]+/u)
    .map((word) => word.replace(/^[-'’]+|[-'’]+$/g, ''))
    .filter((word) => word.length > 1);
}

function hunspell(dictionary, list) {
  if (!list.length) return [];
  const result = spawnSync('hunspell', ['-d', dictionary, '-l', '-i', 'utf-8'], { input: list.join('\n'), encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`hunspell ${dictionary} unavailable: ${result.error?.message || result.stderr}`);
  return result.stdout.split('\n').map((word) => word.trim()).filter(Boolean);
}

export function hunspellAvailable({ dictionary = 'bg_BG' } = {}) {
  const result = spawnSync('hunspell', ['-D'], { input: '', encoding: 'utf8' });
  return !result.error && `${result.stdout}${result.stderr}`.includes(dictionary);
}

// check is hunspell unless a test supplies its own dictionary.
export async function spellcheckPosts(posts, root, { check = hunspell } = {}) {
  let allow = new Set();
  try {
    allow = new Set((await fs.readFile(path.join(root, 'content', 'spell-allow.txt'), 'utf8'))
      .split('\n').map((line) => line.trim().toLocaleLowerCase('bg')).filter((line) => line && !line.startsWith('#')));
  } catch { /* no allow list yet */ }
  const byWord = new Map();
  for (const post of posts) {
    for (const word of postTexts(post).flatMap(words)) {
      if (allow.has(word.toLocaleLowerCase('bg'))) continue;
      if (!byWord.has(word)) byWord.set(word, new Set());
      byWord.get(word).add(post.id);
    }
  }
  const all = [...byWord.keys()];
  const unknown = [
    ...check('bg_BG', all.filter((word) => /\p{Script=Cyrillic}/u.test(word))),
    ...check('en_US', all.filter((word) => /^[\p{Script=Latin}'’-]+$/u.test(word)))
  ];
  // hunspell reports the parts of a hyphenated word ("double-deckers" ->
  // "deckers"), so its answers go through the allow list too, and are traced
  // back to every token that contains them.
  const allowed = (word) => allow.has(word.toLocaleLowerCase('bg'));
  return [...new Set(unknown)].filter((word) => !allowed(word)).map((word) => {
    const posts = new Set(byWord.get(word) || []);
    for (const [token, ids] of byWord) if (token !== word && token.split(/[-'’]/).includes(word)) for (const id of ids) posts.add(id);
    return { word, posts: [...posts] };
  });
}
