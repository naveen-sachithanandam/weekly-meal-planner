#!/bin/bash
# Creates open follow-up issues (#28+) — Ollama fix, F001/F002 sign-off, F003 slices.
# Safe to re-run only if issues do not already exist (will create duplicates).
# See: https://github.com/naveen-sachithanandam/weekly-meal-planner/issues

set -euo pipefail
echo "Follow-up issues are maintained on GitHub. Current open work:"
echo "  #28 Ollama fix (start here)"
echo "  #29-30 Feature 001 sign-off"
echo "  #31 Feature 002 sign-off"
echo "  #32 Feature 003 spec (HITL)"
echo "  #33-35 Feature 003 implementation"
echo ""
echo "Use: gh issue list --repo naveen-sachithanandam/weekly-meal-planner --state open"
