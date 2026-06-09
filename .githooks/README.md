# Git hooks

## prepare-commit-msg

Removes `Co-authored-by:` lines from every commit message.

Enabled for this clone via:

```bash
git config core.hooksPath .githooks
```

New clones: run the command above once after pulling.
