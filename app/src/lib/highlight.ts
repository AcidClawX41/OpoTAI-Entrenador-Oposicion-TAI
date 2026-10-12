// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Resaltado sintáctico mínimo (sin dependencias) para bloques de código de los
 * enunciados: SQL, Java/C/JS, Bash y genérico. Devuelve tokens para pintar con
 * las clases .tok-* de index.css. No pretende ser exhaustivo: solo mejorar la
 * lectura de fragmentos cortos.
 */

export type TokenKind = "k" | "s" | "n" | "c" | "f" | "t";
export interface Token {
  kind: TokenKind;
  text: string;
}

const SQL_KW =
  "select|from|where|group|by|order|having|insert|into|values|update|set|delete|create|table|alter|drop|primary|key|foreign|references|unique|not|null|and|or|in|is|as|join|inner|left|right|outer|on|distinct|count|sum|avg|min|max|limit|union|all|exists|between|like|default|check|constraint|index|view|grant|revoke|commit|rollback|asc|desc|case|when|then|else|end";
const C_KW =
  "public|private|protected|static|final|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|void|int|long|double|float|boolean|char|byte|short|string|String|var|let|const|function|this|super|null|true|false|import|package|enum|abstract|synchronized|instanceof|default|async|await|yield|typeof";
const SH_KW = "if|then|else|fi|for|in|do|done|while|case|esac|function|echo|export|sudo|cd|ls|chmod|chown|grep|cat|ip|ping|systemctl|apt|dnf|ssh|scp|tar|find|mkdir|rm|cp|mv";

function keywordsFor(lang: string): RegExp {
  const l = lang.toLowerCase();
  let kw = C_KW;
  let flags = "";
  if (l === "sql" || l === "mysql" || l === "plsql" || l === "postgresql") {
    kw = SQL_KW;
    flags = "i";
  } else if (l === "bash" || l === "sh" || l === "shell" || l === "console") {
    kw = SH_KW;
  }
  return new RegExp(`^(?:${kw})\\b`, flags);
}

function commentStart(lang: string): RegExp {
  const l = lang.toLowerCase();
  if (l === "sql" || l === "mysql" || l === "plsql" || l === "postgresql") return /^(--[^\n]*|\/\*[\s\S]*?\*\/)/;
  if (l === "bash" || l === "sh" || l === "shell" || l === "console" || l === "python" || l === "py") return /^#[^\n]*/;
  return /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/;
}

export function tokenize(code: string, lang: string): Token[] {
  const tokens: Token[] = [];
  const kw = keywordsFor(lang);
  const comment = commentStart(lang);
  let i = 0;
  let plain = "";
  const flush = () => {
    if (plain) {
      tokens.push({ kind: "t", text: plain });
      plain = "";
    }
  };
  while (i < code.length) {
    const rest = code.slice(i);
    const c = comment.exec(rest);
    if (c) {
      flush();
      tokens.push({ kind: "c", text: c[0] });
      i += c[0].length;
      continue;
    }
    const s = /^("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/.exec(rest);
    if (s) {
      flush();
      tokens.push({ kind: "s", text: s[0] });
      i += s[0].length;
      continue;
    }
    const prev = code[i - 1] ?? " ";
    if (!/[\w$]/.test(prev)) {
      const n = /^\d+(?:\.\d+)?\b/.exec(rest);
      if (n) {
        flush();
        tokens.push({ kind: "n", text: n[0] });
        i += n[0].length;
        continue;
      }
      const k = kw.exec(rest);
      if (k) {
        flush();
        tokens.push({ kind: "k", text: k[0] });
        i += k[0].length;
        continue;
      }
      const f = /^[A-Za-z_]\w*(?=\()/.exec(rest);
      if (f) {
        flush();
        tokens.push({ kind: "f", text: f[0] });
        i += f[0].length;
        continue;
      }
      const w = /^[A-Za-z_$][\w$]*/.exec(rest);
      if (w) {
        plain += w[0];
        i += w[0].length;
        continue;
      }
    }
    plain += code[i];
    i += 1;
  }
  flush();
  return tokens;
}
