import logging
import pathlib
import subprocess
from dataclasses import dataclass

from language_registry import LanguageConfig
from meta_parser import parse_meta

logger = logging.getLogger(__name__)

MAX_OUTPUT_LENGTH = 10_000


@dataclass
class CompileResult:
    success: bool
    stderr: str


@dataclass
class RunResult:
    stdout: str
    stderr: str
    meta: dict
    error_message: str | None


def _box_dir(box_id: int) -> pathlib.Path:
    return pathlib.Path(f"/var/local/lib/isolate/{box_id}/box")


def _read_file(path: pathlib.Path, max_len: int = MAX_OUTPUT_LENGTH) -> str:
    if not path.exists():
        return ""
    text = path.read_text(errors="replace")
    return text[:max_len]


def compile(box_id: int, config: LanguageConfig, source_code: str) -> CompileResult:
    """Compile source code inside an Isolate box. No-op for interpreted languages."""
    if config.compile_cmd is None:
        # Interpreted language — just write source, no compilation needed
        box_dir = _box_dir(box_id)
        (box_dir / config.source_filename).write_text(source_code)
        return CompileResult(success=True, stderr="")

    box_dir = _box_dir(box_id)
    (box_dir / config.source_filename).write_text(source_code)

    cmd = [
        "isolate", f"--box-id={box_id}", "--run",
        "--time=30", "--wall-time=60",
        "--mem=524288",
        "--stderr=compile_err.txt",
        "--",
        *config.compile_cmd,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    stderr = _read_file(box_dir / "compile_err.txt")

    if result.returncode != 0:
        if not stderr:
            stderr = result.stderr or "Compilation failed"
        return CompileResult(success=False, stderr=stderr)

    return CompileResult(success=True, stderr=stderr)


def run(
    box_id: int,
    config: LanguageConfig,
    stdin: str,
    time_limit_sec: int,
    memory_limit_mb: int,
) -> RunResult:
    """Run a program inside an Isolate box with resource limits."""
    box_dir = _box_dir(box_id)
    meta_path = f"/tmp/meta-{box_id}.txt"

    # Write stdin
    if stdin:
        (box_dir / "input.txt").write_text(stdin)

    cmd = [
        "isolate", f"--box-id={box_id}", "--run",
        f"--time={time_limit_sec}",
        f"--wall-time={time_limit_sec * 3}",
        f"--mem={memory_limit_mb * 1024}",
        "--stdout=output.txt",
        "--stderr=error.txt",
        f"--meta={meta_path}",
    ]

    if stdin:
        cmd.append("--stdin=input.txt")

    cmd.extend(["--", *config.run_cmd])

    subprocess.run(cmd, capture_output=True, text=True, timeout=time_limit_sec * 3 + 30)

    stdout = _read_file(box_dir / "output.txt")
    stderr = _read_file(box_dir / "error.txt")
    meta = parse_meta(meta_path)

    error_message = _map_status(meta)

    return RunResult(stdout=stdout, stderr=stderr, meta=meta, error_message=error_message)


def _map_status(meta: dict) -> str | None:
    status = meta.get("status")
    if status is None:
        return None

    match status:
        case "TO":
            return "Time limit exceeded"
        case "MLE":
            return "Memory limit exceeded"
        case "RE":
            return f"Runtime error (exit code {meta.get('exit_code', -1)})"
        case "SG":
            return "Process killed by signal"
        case _:
            return f"Unknown status: {status}"
