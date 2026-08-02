# Task 4 Smoke Report

**Status:** DONE

## create host
- Template: create-host-default
- build → dist/index.mjs ~228KB with PhoneExtension
- HOST_BUILD_OK=True

## pack demo-shop
- release/dist/index.mjs ~11.5KB
- PhoneExtension count=0
- banned dirs absent (phone-sdk/scripts/docs/dist-dev)
- release/src/demo-shop present
- ALL_SMOKE_PASS

## Note
DEP0190 DeprecationWarning from spawnSync(..., { shell: true }) in pack.ts — Minor, fix optional.
