#!/usr/bin/env python3
"""Safe anchored patch tool for repo files.

Designed for controlled file surgery in large text files.

Supported operations:
- replace-first
- replace-all
- insert-before
- insert-after
- replace-between

Anchors:
- exact string
- regex

Safety:
- optional expected match count
- unique-only checks
- no-write dry run mode
- explicit failure on ambiguity
"""

from __future__ import annotations

import argparse
import difflib
import pathlib
import re
import sys
from dataclasses import dataclass


@dataclass
class MatchRegion:
    start: int
    end: int
    text: str


def load_text(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def save_text(path: pathlib.Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def find_regions(text: str, needle: str, use_regex: bool) -> list[MatchRegion]:
    if use_regex:
        return [
            MatchRegion(match.start(), match.end(), match.group(0))
            for match in re.finditer(needle, text, flags=re.MULTILINE | re.DOTALL)
        ]

    regions: list[MatchRegion] = []
    start = 0
    while True:
        idx = text.find(needle, start)
        if idx == -1:
            break
        end = idx + len(needle)
        regions.append(MatchRegion(idx, end, text[idx:end]))
        start = end
    return regions


def require_match_policy(regions: list[MatchRegion], expected: int | None, unique_only: bool) -> None:
    if not regions:
        raise ValueError("anchor not found")
    if expected is not None and len(regions) != expected:
        raise ValueError(f"expected {expected} matches, found {len(regions)}")
    if unique_only and len(regions) != 1:
        raise ValueError(f"unique match required, found {len(regions)}")


def apply_replace_first(text: str, regions: list[MatchRegion], replacement: str) -> str:
    region = regions[0]
    return text[: region.start] + replacement + text[region.end :]


def apply_replace_all(text: str, regions: list[MatchRegion], replacement: str) -> str:
    pieces: list[str] = []
    cursor = 0
    for region in regions:
        pieces.append(text[cursor : region.start])
        pieces.append(replacement)
        cursor = region.end
    pieces.append(text[cursor:])
    return "".join(pieces)


def apply_insert_before(text: str, regions: list[MatchRegion], insertion: str) -> str:
    region = regions[0]
    return text[: region.start] + insertion + text[region.start :]


def apply_insert_after(text: str, regions: list[MatchRegion], insertion: str) -> str:
    region = regions[0]
    return text[: region.end] + insertion + text[region.end :]


def apply_replace_between(text: str, start_regions: list[MatchRegion], end_regions: list[MatchRegion], replacement: str) -> str:
    start_region = start_regions[0]
    end_region = end_regions[0]
    if end_region.start < start_region.end:
        raise ValueError("end anchor appears before start anchor")
    return text[: start_region.end] + replacement + text[end_region.start :]


def diff_text(old: str, new: str, path: str) -> str:
    return "".join(
        difflib.unified_diff(
            old.splitlines(keepends=True),
            new.splitlines(keepends=True),
            fromfile=f"{path} (before)",
            tofile=f"{path} (after)",
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Safe anchored patch tool")
    parser.add_argument("file", help="target file path")
    parser.add_argument(
        "operation",
        choices=["replace-first", "replace-all", "insert-before", "insert-after", "replace-between"],
        help="patch operation",
    )
    parser.add_argument("--anchor", help="primary anchor")
    parser.add_argument("--end-anchor", help="end anchor for replace-between")
    parser.add_argument("--replacement", default="", help="replacement or insertion text")
    parser.add_argument("--regex", action="store_true", help="treat anchors as regex")
    parser.add_argument("--expected", type=int, help="expected number of primary matches")
    parser.add_argument("--end-expected", type=int, help="expected number of end-anchor matches")
    parser.add_argument("--unique-only", action="store_true", help="require exactly one primary match")
    parser.add_argument("--dry-run", action="store_true", help="print diff only")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    path = pathlib.Path(args.file)
    if not path.exists():
        print(f"error: file not found: {path}", file=sys.stderr)
        return 1

    if args.operation != "replace-between" and not args.anchor:
        print("error: --anchor is required for this operation", file=sys.stderr)
        return 1

    if args.operation == "replace-between" and (not args.anchor or not args.end_anchor):
        print("error: --anchor and --end-anchor are required for replace-between", file=sys.stderr)
        return 1

    original = load_text(path)

    try:
        if args.operation == "replace-between":
            start_regions = find_regions(original, args.anchor, args.regex)
            end_regions = find_regions(original, args.end_anchor, args.regex)
            require_match_policy(start_regions, args.expected, args.unique_only)
            require_match_policy(end_regions, args.end_expected, True)
            updated = apply_replace_between(original, start_regions, end_regions, args.replacement)
        else:
            regions = find_regions(original, args.anchor, args.regex)
            require_match_policy(regions, args.expected, args.unique_only)
            if args.operation == "replace-first":
                updated = apply_replace_first(original, regions, args.replacement)
            elif args.operation == "replace-all":
                updated = apply_replace_all(original, regions, args.replacement)
            elif args.operation == "insert-before":
                updated = apply_insert_before(original, regions, args.replacement)
            elif args.operation == "insert-after":
                updated = apply_insert_after(original, regions, args.replacement)
            else:
                raise ValueError(f"unsupported operation: {args.operation}")
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if updated == original:
        print("error: patch produced no change", file=sys.stderr)
        return 1

    patch_diff = diff_text(original, updated, str(path))
    print(patch_diff)

    if not args.dry_run:
        save_text(path, updated)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
