#!/usr/bin/env python3
"""Stamp every local stylesheet and script URL with a hash of its contents.

Safari will answer a request for an asset URL it has seen before straight
from its cache, even against Cache-Control: max-age=0, must-revalidate. A
URL it has never seen cannot be served that way, so each file carries a
short hash of its own bytes:

    assets/css/base.css?v=a1b2c3d4

Only files that actually changed get a new URL, so visitors keep the cached
copies of everything else.

    python3 scripts/bump-assets.py            update the stamps
    python3 scripts/bump-assets.py --check    report staleness, change nothing
                                              (exit 1 if anything is stale)

Run it after editing anything under assets/css or assets/js, or chatbot.js
or supabase.js, and commit the result alongside the change.
"""

import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# href/src="./assets/css/x.css?v=..." in the HTML pages. The "./" is optional:
# the pages are inconsistent about it, and a reference written bare would
# otherwise slip through unstamped.
HTML_REF = re.compile(
    r'((?:href|src)="(?:\./)?'
    r'(assets/(?:css|js)/[\w-]+\.(?:css|js)|chatbot\.js|supabase\.js)'
    r')(?:\?v=[\w.-]+)?"'
)

# import ... from '../../supabase.js?v=...'  inside the ES modules
IMPORT_REF = re.compile(r"(from\s+['\"])(\.\./\.\./supabase\.js)(?:\?v=[\w.-]+)?(['\"])")


def digest(path: pathlib.Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()[:8]


def main() -> int:
    check_only = "--check" in sys.argv

    cache: dict[str, str] = {}
    missing: set[str] = set()

    def version_for(rel: str) -> str | None:
        """Hash of the referenced file, or None if it is not on disk."""
        if rel in cache:
            return cache[rel]
        target = ROOT / rel
        if not target.is_file():
            missing.add(rel)
            return None
        cache[rel] = digest(target)
        return cache[rel]

    changed: list[str] = []
    stale = 0

    def rewrite(path: pathlib.Path, pattern, build) -> None:
        nonlocal stale
        original = path.read_text()
        updated = pattern.sub(build, original)
        if updated == original:
            return
        stale += 1
        if not check_only:
            path.write_text(updated)
        changed.append(str(path.relative_to(ROOT)))

    # Modules first. Stamping the supabase.js import rewrites those files, which
    # changes their own hashes — doing the pages first would bake in stamps that
    # are stale by the time this finishes, and take a second run to settle.
    for module in sorted((ROOT / "assets/js").glob("*.js")):
        def build(m):
            v = version_for("supabase.js")
            tail = m.group(2) if v is None else f"{m.group(2)}?v={v}"
            return f"{m.group(1)}{tail}{m.group(3)}"
        rewrite(module, IMPORT_REF, build)

    cache.clear()   # the modules on disk have moved on

    for page in sorted(ROOT.glob("*.html")):
        def build(m):
            v = version_for(m.group(2))
            return f'{m.group(1)}"' if v is None else f'{m.group(1)}?v={v}"'
        rewrite(page, HTML_REF, build)

    for rel in sorted(missing):
        print(f"  ! referenced but not on disk: {rel}")

    if not changed:
        print("Semua stempel versi sudah sesuai isi file.")
        return 0

    verb = "perlu diperbarui" if check_only else "diperbarui"
    print(f"{len(changed)} file {verb}:")
    for name in changed:
        print(f"  {name}")

    if check_only:
        print("\nJalankan tanpa --check untuk menerapkan.")
        return 1

    print("\nCommit perubahan ini bersama perubahan CSS/JS-nya.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
