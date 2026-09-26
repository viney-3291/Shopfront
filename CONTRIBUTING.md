# Contributing

## Branch naming

| Prefix | Use for |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `infra/` | Terraform, Helm, Kubernetes manifests |
| `chore/` | Dependency bumps, cleanup, refactors |
| `docs/` | Documentation only |

Example: `feature/add-wishlist`, `fix/cart-total-rounding`, `infra/bump-node-count`.

## Workflow

1. Branch off `main`: `git checkout -b feature/your-thing`
2. Commit and push your changes
3. Open a PR — the template will guide what to fill in
4. Wait for CI to pass (required before merge)
5. Merge via GitHub's UI
6. Delete the branch after merging

Direct pushes to `main` are blocked — everything goes through a PR, even small fixes.