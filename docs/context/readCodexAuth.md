# readCodexAuth

## Function
- **Name:** `readCodexAuth`
- **File:** `src/codex.js`
- **Line Range:** Lines 32–39

## How It Works

`readCodexAuth` safely retrieves, parses, and validates the primary OpenAI Codex authentication credentials from `~/.codex/auth.json`.

1. **Filesystem Presence Verification (lines 32–33):**
   - Checks whether the target Codex authentication file at `CODEX_AUTH` (`~/.codex/auth.json`) exists using `fs.existsSync(CODEX_AUTH)` on line 33.
   - If the file does not exist, returns `null` immediately, signaling that no active Codex session is configured or installed.

2. **Safe JSON Deserialization (lines 34–38):**
   - Wraps the read operation in a `try...catch` block to handle file lock races or malformed JSON gracefully (lines 34–38).
   - Reads the file synchronously as UTF-8 via `fs.readFileSync(CODEX_AUTH, 'utf8')` and deserializes it with `JSON.parse`.
   - The returned object structure depends on the configured Codex authentication mode:
     - **`chatgpt` mode:** Contains `{ auth_mode: "chatgpt", tokens: { id_token, access_token, refresh_token, account_id }, last_refresh }`.
     - **`api_key` mode:** Contains `{ auth_mode: "api_key", OPENAI_API_KEY: "sk-...", tokens: null, last_refresh }`.
   - If parsing fails (for example due to corrupt syntax or incomplete write), catches the exception and returns `null` instead of crashing the process (lines 36–38).

## Code Copy

```javascript
// src/codex.js (lines 32–39)
function readCodexAuth() {
  if (!fs.existsSync(CODEX_AUTH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CODEX_AUTH, 'utf8'));
  } catch (_) {
    return null;
  }
}
```
