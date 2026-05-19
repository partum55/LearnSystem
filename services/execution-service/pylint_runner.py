import json
import logging
import re
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class PylintMessage:
    line: int
    column: int
    type: str
    message: str
    symbol: str


@dataclass
class PylintResult:
    score: float
    passed: bool
    messages: list[PylintMessage] = field(default_factory=list)


def run_pylint(code: str, min_score: float) -> PylintResult:
    """Run pylint on code OUTSIDE Isolate (static analysis only)."""
    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False
        ) as tmp:
            tmp.write(code)
            tmp_path = Path(tmp.name)

        result = subprocess.run(
            [
                "python3.14", "-m", "pylint",
                str(tmp_path),
                "--output-format=json",
                "--disable=C0114,C0115,C0116",
                "--score=y",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        # Parse messages from JSON stdout
        messages: list[PylintMessage] = []
        try:
            items = json.loads(result.stdout) if result.stdout.strip() else []
            for item in items:
                messages.append(PylintMessage(
                    line=item.get("line", 0),
                    column=item.get("column", 0),
                    type=item.get("type", "warning"),
                    message=item.get("message", ""),
                    symbol=item.get("symbol", ""),
                ))
        except json.JSONDecodeError:
            logger.warning("Failed to parse pylint JSON output")

        # Extract score from stderr
        score = 0.0
        score_match = re.search(
            r"Your code has been rated at (-?[\d.]+)/10", result.stderr
        )
        if score_match:
            score = float(score_match.group(1))

        return PylintResult(
            score=score,
            passed=score >= min_score,
            messages=messages,
        )

    except Exception as e:
        logger.error("Pylint execution failed: %s", e)
        return PylintResult(
            score=0.0,
            passed=False,
            messages=[PylintMessage(
                line=0, column=0, type="error",
                message=str(e), symbol="pylint-error",
            )],
        )
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink()
