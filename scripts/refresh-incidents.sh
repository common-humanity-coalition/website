#!/usr/bin/env bash
#
# refresh-incidents.sh — PULL the latest published-incidents snapshot from the
# incident database export endpoint and (after a preview + confirmation) update
# the committed local snapshot consumed by the incidents-app build.
#
# GitHub's CI runners CANNOT reach the internal/tailnet DB, so the snapshot must
# be refreshed HERE on the server and committed. This script ONLY updates the
# local file; it does NOT commit or deploy (see `make deploy` / `make publish`).
#
# Behaviour:
#   - curls the endpoint into a temp file
#   - validates it is JSON with version == 1 and a non-empty incidents array
#     (fails clearly if the endpoint is unreachable or the payload is wrong)
#   - shows a PREVIEW diff vs the current incidents-app/data/snapshot.json:
#       total count, # new ids, # removed ids, # changed incidents
#     (a diff that is ONLY `generated_at` is reported as "no data changes")
#   - prompts `Update local snapshot? [y/N]` (set ASSUME_YES=1 to skip the prompt)
#   - on yes, overwrites incidents-app/data/snapshot.json
#
set -euo pipefail

# --- EDIT HERE: the export endpoint URL -------------------------------------
# Read-only, unauthenticated v1 snapshot of PUBLISHED incidents only.
# Reachable only from the tailnet (stork-danio.ts.net) / this server.
SNAPSHOT_URL="${SNAPSHOT_URL:-http://incident-database.stork-danio.ts.net/public/snapshot.json}"
# ----------------------------------------------------------------------------

# Resolve repo root (this script lives in <root>/scripts/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$ROOT_DIR/incidents-app/data/snapshot.json"

NODE_IMAGE="node:22"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

fail() { red "ERROR: $*" >&2; exit 1; }

# The fetched file lives INSIDE the data dir (under $HOME) so Colima can bind-
# mount it into the node container. Colima only mounts $HOME, so a /var/folders
# mktemp path would mount as an empty dir. The .incoming.json name is gitignored.
DATA_DIR="$ROOT_DIR/incidents-app/data"
TMP="$DATA_DIR/.snapshot.incoming.json"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

bold "Pulling snapshot from: $SNAPSHOT_URL"
if ! curl -fsS --max-time 60 -o "$TMP" "$SNAPSHOT_URL"; then
  fail "Could not fetch the snapshot. Is the endpoint reachable from this host?
       URL: $SNAPSHOT_URL
       (The DB is only reachable on the tailnet / from this server.)"
fi

# Validate + diff inside a node container (no host node required). Both the
# fetched file (.snapshot.incoming.json) and the current committed file
# (snapshot.json) live in the mounted /data dir. The container exits non-zero
# on validation failure, prints a one-line CHANGED:<0|1> marker for the caller,
# and a human preview to stderr.
CURRENT_PRESENT=0
[ -f "$DEST" ] && CURRENT_PRESENT=1

set +e
DIFF_OUT="$(
  /opt/homebrew/bin/docker run --rm \
    -v "$DATA_DIR":/data:ro \
    -e CURRENT_PRESENT="$CURRENT_PRESENT" \
    "$NODE_IMAGE" node -e '
      const fs = require("fs");
      function readJson(p) {
        const raw = fs.readFileSync(p, "utf8");
        return JSON.parse(raw);
      }
      let next;
      try { next = readJson("/data/.snapshot.incoming.json"); }
      catch (e) { console.error("Fetched payload is not valid JSON: " + e.message); process.exit(3); }

      if (next.version !== 1) {
        console.error("Snapshot version is " + JSON.stringify(next.version) + ", expected 1.");
        process.exit(4);
      }
      if (!Array.isArray(next.incidents) || next.incidents.length === 0) {
        console.error("Snapshot has no incidents (empty or missing array). Refusing to use it.");
        process.exit(5);
      }

      const present = process.env.CURRENT_PRESENT === "1";
      let cur = null;
      if (present) {
        try { cur = readJson("/data/snapshot.json"); }
        catch (e) { console.error("WARN: current snapshot unreadable (" + e.message + "); treating as brand new."); cur = null; }
      }

      const nextIds = new Set(next.incidents.map(i => i.id));
      console.error("");
      console.error("  New snapshot generated_at: " + (next.generated_at || "(none)"));
      console.error("  New total incidents:       " + next.incidents.length);

      if (!cur) {
        console.error("  (no current local snapshot — this would be a fresh write)");
        console.error("");
        console.log("CHANGED:1");
        process.exit(0);
      }

      const curIds = new Set((cur.incidents || []).map(i => i.id));
      const added = [...nextIds].filter(id => !curIds.has(id));
      const removed = [...curIds].filter(id => !nextIds.has(id));

      // Changed incidents: present in both, but JSON differs.
      const curById = new Map((cur.incidents || []).map(i => [i.id, JSON.stringify(i)]));
      let changed = 0;
      for (const inc of next.incidents) {
        if (curById.has(inc.id) && curById.get(inc.id) !== JSON.stringify(inc)) changed++;
      }

      console.error("  Current total incidents:   " + (cur.incidents || []).length);
      console.error("");
      console.error("  + new ids:        " + added.length);
      console.error("  - removed ids:    " + removed.length);
      console.error("  ~ changed:        " + changed);
      console.error("");

      // Determine whether anything other than generated_at changed. We compare
      // the two payloads with generated_at neutralised.
      const norm = (s) => { const c = JSON.parse(JSON.stringify(s)); delete c.generated_at; return JSON.stringify(c); };
      const dataChanged = norm(cur) !== norm(next);

      if (!dataChanged) {
        console.error("  No data changes (only generated_at differs).");
        console.log("CHANGED:0");
      } else {
        console.log("CHANGED:1");
      }
      process.exit(0);
    '
)"
RC=$?
set -e

# Surface the human-readable preview (it was written to stderr inside the
# container, but docker merges it into our captured stream depending on TTY;
# print whatever came back that is not the marker line).
echo "$DIFF_OUT" | grep -v '^CHANGED:' >&2 || true

if [ $RC -ne 0 ]; then
  case $RC in
    3) fail "Fetched payload is not valid JSON." ;;
    4) fail "Snapshot version mismatch (expected version:1)." ;;
    5) fail "Snapshot incidents array is empty or missing." ;;
    *) fail "Validation failed (exit $RC)." ;;
  esac
fi

CHANGED="$(printf '%s\n' "$DIFF_OUT" | sed -n 's/^CHANGED:\(.*\)$/\1/p' | tail -n1)"

if [ "$CHANGED" != "1" ]; then
  green "Local snapshot is already current — nothing to update."
  exit 0
fi

# Confirm before overwriting.
if [ "${ASSUME_YES:-0}" = "1" ]; then
  REPLY="y"
  echo "ASSUME_YES=1 set — updating without prompt."
else
  printf 'Update local snapshot? [y/N] '
  read -r REPLY || REPLY=""
fi

case "$REPLY" in
  y|Y|yes|YES)
    cp "$TMP" "$DEST"
    green "Updated $DEST"
    ;;
  *)
    echo "Left local snapshot unchanged."
    ;;
esac
