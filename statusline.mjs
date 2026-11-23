#!/usr/bin/env node
/**
 * copilot-hud: status line for GitHub Copilot CLI.
 * Reads the session status JSON from stdin and prints one row per line.
 * Node.js stdlib only.
 */
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const RESET = '\x1b[0m';
const c = (n, s) => `\x1b[${n}m${s}${RESET}`;
const DIM = 90, GREEN = 32, YELLOW = 33, RED = 31, CYAN = 36, MAGENTA = 35;

const WARN = 70;
const CRIT = 90;

function readStdin() {
  return new Promise(resolve => {
    if (process.stdin.isTTY) return resolve(null);
    let d = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', x => (d += x));
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(d)); } catch { resolve(null); }
    });
  });
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function pctColor(p) {
  return p >= CRIT ? RED : p >= WARN ? YELLOW : GREEN;
}

function bar(p, width = 10) {
  const filled = Math.round((Math.min(100, Math.max(0, p)) / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function fmtDuration(ms) {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

function fmtTokens(n) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);
}

function fmtUsd(ai) {
  const nano = ai?.total_nano_aiu ?? (ai?.formatted != null ? Number(ai.formatted) * 1e9 : null);
  if (nano == null || Number.isNaN(nano)) return null;
  return `$${(nano / 1e11).toFixed(2)}`;
}

function renderGit(cwd) {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  if (!branch) return null;
  const top = git(['rev-parse', '--show-toplevel'], cwd);
  const dirty = git(['status', '--porcelain'], cwd) ? c(YELLOW, '*') : '';
  return `${c(CYAN, basename(top))} ${c(MAGENTA, branch)}${dirty}`;
}

function renderContext(cw) {
  if (!cw) return null;
  const p = cw.current_context_used_percentage ?? cw.used_percentage;
  if (p == null) return null;
  const used = cw.current_context_tokens;
  const detail = used != null ? ` ${fmtTokens(used)}/${fmtTokens(cw.context_window_size)}` : '';
  return c(pctColor(p), `ctx ${bar(p)} ${p}%`) + c(DIM, detail);
}

function renderCost(cost, ai) {
  const parts = [];
  if (cost?.total_duration_ms != null) parts.push(c(DIM, fmtDuration(cost.total_duration_ms)));
  if (cost?.total_lines_added || cost?.total_lines_removed) {
    parts.push(c(GREEN, `+${cost.total_lines_added}`) + ' ' + c(RED, `-${cost.total_lines_removed}`));
  }
  if (cost?.total_premium_requests != null) parts.push(c(DIM, `${cost.total_premium_requests} req`));
  const usd = fmtUsd(ai);
  if (usd) parts.push(c(DIM, usd));
  return parts.length ? parts.join(' · ') : null;
}

async function main() {
  const s = await readStdin();
  if (!s) return;
  const cwd = s.cwd || process.cwd();
  const model = s.model?.display_name || s.model?.id;

  const row1 = [model && c(CYAN, model), renderGit(cwd), s.allow_all_enabled && c(RED, 'YOLO')].filter(Boolean);
  const row2 = [renderContext(s.context_window), renderCost(s.cost, s.ai_used)].filter(Boolean);

  const sep = c(DIM, ' │ ');
  for (const row of [row1, row2]) if (row.length) console.log(row.join(sep));
}

main();
