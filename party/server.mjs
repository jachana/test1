// The party server: one laptop, everybody else's phones.
//
//   node party/server.mjs
//
// It prints the address to read out to the room, serves the host screen at
// /host and the phone controller at /, and pushes state with Server-Sent
// Events. No dependencies and no build step, on purpose — this runs on a
// laptop plugged into a TV at a LAN party, where the wifi is bad and nobody is
// going to npm install anything at 11pm.
//
// SSE rather than WebSockets for the same reason: it is one-directional from
// the server, which is all the game needs (phones POST), and it is about
// fifteen lines of plain `http` instead of a dependency and a handshake.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import {
  createGame, addPlayer, rejoin, removePlayer, startGame, askNext, submitAnswer,
  reveal, showStandings, addPrompt, publicState, timeLeft, currentRound,
} from './game.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8000);

const game = createGame();
const clients = new Set(); // { res, playerId }

// --------------------------------------------------------------- broadcasting

function push(client) {
  const state = publicState(game, client.playerId);
  client.res.write(`data: ${JSON.stringify(state)}\n\n`);
}

function broadcast() {
  for (const client of clients) {
    try {
      push(client);
    } catch {
      clients.delete(client); // the phone went away mid-write
    }
  }
}

/**
 * The clock. The server owns it so that a phone with a slow connection cannot
 * answer after the room has seen the reveal.
 */
setInterval(() => {
  if (game.phase === 'asking' && timeLeft(game) <= 0) {
    reveal(game);
    broadcast();
  }
}, 250);

// Keeps proxies and phone radios from quietly dropping an idle SSE stream.
setInterval(() => {
  for (const client of clients) {
    try { client.res.write(': keepalive\n\n'); } catch { clients.delete(client); }
  }
}, 20_000);

// ------------------------------------------------------------- static files

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

async function serveFile(res, name, allowOutside = false) {
  // normalize + strip leading dots: this is a LAN toy, but it still should not
  // hand out the contents of the laptop it is running on. `allowOutside` is for
  // the handful of paths the routes name literally, never for user input.
  const safe = allowOutside ? name : normalize(name).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(HERE, safe));
    res.writeHead(200, { 'content-type': TYPES[extname(safe)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 8192) raw = raw.slice(0, 8192); // nobody needs to POST a novel
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
    });
  });
}

// --------------------------------------------------------------- the routes

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/') return serveFile(res, 'player.html');
  if (path === '/host') return serveFile(res, 'host.html');
  // The embedded Silkscreen lives with the idle game; the party game borrows it
  // rather than shipping a second copy of the same 90KB of base64.
  if (path === '/assets/fonts.css') return serveFile(res, '../src/fonts.css', true);
  if (path.startsWith('/assets/')) return serveFile(res, path.slice('/assets/'.length));

  if (path === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    const client = { res, playerId: url.searchParams.get('id') || null };
    if (client.playerId) rejoin(game, client.playerId);
    clients.add(client);
    push(client);
    broadcast(); // everybody else should see them light up
    req.on('close', () => {
      clients.delete(client);
      if (client.playerId && ![...clients].some((c) => c.playerId === client.playerId)) {
        removePlayer(game, client.playerId);
        broadcast();
      }
    });
    return undefined;
  }

  if (req.method === 'POST' && path.startsWith('/api/')) {
    const body = await readBody(req);
    const action = path.slice('/api/'.length);
    let result;

    switch (action) {
      case 'join': {
        const existing = body.id && rejoin(game, body.id);
        if (existing) { broadcast(); return json(res, 200, { player: existing }); }
        result = addPlayer(game, body.name);
        break;
      }
      case 'answer': result = submitAnswer(game, body.id, body.value); break;
      case 'start': result = startGame(game); break;
      case 'next':
        // One button drives the whole evening — except at the end, where it
        // does nothing. Somebody will tap space out of habit while the room is
        // still reading the final scores, and starting a new game over the top
        // of them is not a thing you can undo.
        result = game.phase === 'asking' ? reveal(game)
          : game.phase === 'reveal' ? askNext(game)
            : game.phase === 'standings' ? askNext(game)
              : game.phase === 'lobby' ? startGame(game)
                : { ok: true };
        break;
      case 'skip': result = game.phase === 'asking' ? reveal(game) : askNext(game); break;
      case 'standings': result = showStandings(game); break;
      case 'prompt': result = addPrompt(game, body.text); break;
      case 'reset': {
        Object.assign(game, createGame({ prompts: game.prompts }));
        result = { ok: true };
        break;
      }
      default: return json(res, 404, { error: 'no such action' });
    }

    broadcast();
    return json(res, result?.error ? 400 : 200, result);
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
});

/** The address to read out to the room — the LAN one, not 127.0.0.1. */
function lanAddress() {
  for (const entries of Object.values(networkInterfaces())) {
    for (const net of entries ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const host = lanAddress();
  const line = `http://${host}:${PORT}`;
  console.log('');
  console.log('  \x1b[1mTibia LAN Party\x1b[0m');
  console.log('');
  console.log(`  Big screen   \x1b[33m${line}/host\x1b[0m`);
  console.log(`  Phones       \x1b[1m\x1b[33m${line}\x1b[0m`);
  console.log('');
  console.log(`  ${game.prompts.length} prompts loaded — edit party/prompts.mjs before the party.`);
  console.log('');
});

export { server, game };
