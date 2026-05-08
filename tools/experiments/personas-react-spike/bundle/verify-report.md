# Verify Report

**Bundle:** `tools/experiments/personas-react-spike/bundle`
**Generated:** `tools/experiments/personas-react-spike/bundle/generated/dist`
**Threshold:** 95%
**Verdict:** ❌ FAIL

| Viewport |    Match |            Diff Pixels | Diff Image                |
| -------- | -------: | ---------------------: | ------------------------- |
| mobile   | ✗ 81.82% | 3’113’029 / 17’124’768 | `verify-diff-mobile.png`  |
| tablet   | ✗ 75.94% | 3’750’576 / 15’585’960 | `verify-diff-tablet.png`  |
| desktop  | ✗ 71.94% | 5’027’221 / 17’916’525 | `verify-diff-desktop.png` |

## Iteration

If any viewport is below threshold:

1. Open `verify-diff-<vp>.png` to see what differs (red = mismatch)
2. Compare `render-snapshot/screenshot-<vp>.png` (baseline) and `verify-screenshot-<vp>.png` (your output)
3. Adjust the generated code, rebuild (`npm run build` in ./generated/), rerun `mirror-verify`
