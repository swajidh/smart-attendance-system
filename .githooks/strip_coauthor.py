"""Remove Co-authored-by trailers from commit messages (prepare-commit-msg hook)."""
from __future__ import annotations

import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 2:
        return
    path = Path(sys.argv[1])
    if not path.is_file():
        return

    lines = path.read_text(encoding="utf-8").splitlines()
    kept = [line for line in lines if not line.strip().lower().startswith("co-authored-by:")]
    text = "\n".join(kept).rstrip()
    if text:
        text += "\n"
    path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
