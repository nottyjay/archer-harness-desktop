# Bundled runtime payloads

Release builds populate one target directory before each `tauri build`:

```
bundled/<os>-<arch>/node/   # extracted Node.js distribution
bundled/<os>-<arch>/dsh/    # compiled deepseek-harness package
```

The build downloads and verifies Node.js 22.22.0, then compiles the vendored
`vendor/deepseek-harness` source and deploys its production dependency tree.
`NODE_BUNDLED_DIR[_<TARGET>]` and `DSH_BUNDLED_DIR[_<TARGET>]` remain optional
overrides for CI-produced payloads.

The desktop reads these directories directly from the installed resource
directory. It does not copy them to AppData or run post-install Node/DSH
downloads. The build pipeline removes other target directories before
packaging, so each installer contains only its target runtime.
