"""Shared helpers for the scripts that write data/*.json.

Every data file carries a `provenance` block: the script that wrote it, the files it read, and what
it is. The site prints that block under each chart, so a reader can go from any number to the line
of research or the experiment that produced it.
"""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def write_json(name: str, script: str, sources: list[str], about: str, body: dict[str, Any]) -> Path:
    """Writes data/<name>.json with its provenance first, then `body`."""
    DATA.mkdir(exist_ok=True)
    out = DATA / f"{name}.json"
    doc = {
        "provenance": {
            "script": rel(Path(script)),
            "sources": sources,
            "about": about,
        },
        **body,
    }
    out.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print(f"wrote {rel(out)}")
    return out


def load_costmodel() -> dict[str, Any]:
    """The cost model's parameter table S and its run() function, exactly as written in
    experiments/cost-model/costmodel.py, without the module's top-level printing (which mutates S).

    Only the `S = {...}` assignment and the `def run` are executed, from the file's own source."""
    path = ROOT / "experiments/cost-model/costmodel.py"
    tree = ast.parse(path.read_text(encoding="utf8"), filename=str(path))
    keep: list[ast.stmt] = [
        node
        for node in tree.body
        if (isinstance(node, ast.FunctionDef) and node.name == "run")
        or (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and node.targets[0].id == "S"
        )
    ]
    if len(keep) != 2:
        raise SystemExit("costmodel.py no longer has exactly one S table and one run(); update this loader")
    ns: dict[str, Any] = {}
    exec(compile(ast.Module(body=keep, type_ignores=[]), str(path), "exec"), ns)  # noqa: S102
    return ns


def costmodel_comments() -> dict[str, str]:
    """The inline comment beside each key of S in costmodel.py (its units and meaning)."""
    path = ROOT / "experiments/cost-model/costmodel.py"
    comments: dict[str, str] = {}
    for line in path.read_text(encoding="utf8").splitlines():
        m = re.match(r"\s*'(\w+)':\s*\(.*\),\s*#\s*(.+)$", line)
        if m:
            comments[m.group(1)] = m.group(2).strip()
    return comments


# --- Markdown tables -------------------------------------------------------------------------


def md_tables(path: Path) -> list[dict[str, Any]]:
    """Every pipe table in a Markdown file, with the heading it sits under and its line number."""
    lines = path.read_text(encoding="utf8").splitlines()
    tables: list[dict[str, Any]] = []
    heading = ""
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("#"):
            heading = line.lstrip("#").strip()
        if (
            line.startswith("|")
            and i + 1 < len(lines)
            and re.match(r"^\|(\s*:?-+:?\s*\|)+\s*$", lines[i + 1])
        ):
            header = split_row(line)
            rows = []
            j = i + 2
            while j < len(lines) and lines[j].startswith("|"):
                rows.append(split_row(lines[j]))
                j += 1
            tables.append({"heading": heading, "line": i + 1, "header": header, "rows": rows})
            i = j
            continue
        i += 1
    return tables


def split_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def find_table(path: Path, first_header: str, heading_contains: str = "") -> dict[str, Any]:
    for t in md_tables(path):
        if t["header"][0] == first_header and heading_contains in t["heading"]:
            return t
    raise SystemExit(f"{rel(path)}: no table starting with '{first_header}' under '{heading_contains}'")


def plain(cell: str) -> str:
    """A table cell without Markdown emphasis or links."""
    cell = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cell)
    return cell.replace("**", "").replace("*", "").strip()


def number(cell: str) -> float | None:
    """A cell's single number: '1.5', '**~700x**', '~10^6', '~15,000x'. None for an empty cell."""
    s = plain(cell).replace("~", "").replace(",", "").strip()
    if not s:
        return None
    m = re.fullmatch(r"10\^(\d+)", s)
    if m:
        return float(10 ** int(m.group(1)))
    m = re.fullmatch(r"(\d+(?:\.\d+)?)x?", s)
    if not m:
        raise ValueError(f"not a single number: {cell!r}")
    return float(m.group(1))


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", plain(text).lower()).strip("-")


# --- Numbers quoted in prose ---------------------------------------------------------------------


def grab(path: str, pattern: str) -> dict[str, Any]:
    """The one match of `pattern` in a research file, with its line number and the line's text.

    Charts that use a number written in prose read it through here, so the number on the chart is
    the number in the text, and a reworded sentence fails the build instead of drifting."""
    lines = (ROOT / path).read_text(encoding="utf8").splitlines()
    hits = [(i, m) for i, line in enumerate(lines) for m in [re.search(pattern, line)] if m]
    if len(hits) != 1:
        raise SystemExit(f"{path}: expected one match for {pattern!r}, found {len(hits)}")
    i, m = hits[0]
    return {"file": path, "line": i + 1, "groups": m.groups(), "match": m.group(0)}


def num(s: str) -> float:
    return float(s.replace(",", ""))
