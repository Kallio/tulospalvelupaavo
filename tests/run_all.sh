#!/usr/bin/env bash
# Run the full test suite (zero-dependency Node DOM-stub tests + guarded XSD test).
set -u
cd "$(dirname "$0")"
fail=0
for t in test_*.js; do
  echo "== $t"
  if ! node "$t" >/dev/null 2>&1; then
    echo "  FAILED (see full output below)"
    node "$t"
    fail=1
  else
    node "$t" 2>/dev/null | grep -E 'passed' | sed 's/^/  /'
  fi
done
echo "== test_ppen_xsd.py"
python3 test_ppen_xsd.py || fail=1
exit "$fail"
