import logging
import subprocess
import time
from contextlib import asynccontextmanager
from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import isolate_runner
import language_registry
import test_runner
from box_pool import BoxPool
from pylint_runner import run_pylint

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

box_pool = BoxPool(max_boxes=100)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Cleaning up stale isolate boxes...")
    for box_id in range(100):
        subprocess.run(
            ["isolate", f"--box-id={box_id}", "--cleanup"],
            capture_output=True,
        )
    logger.info("Startup cleanup complete")
    yield


app = FastAPI(title="LMS Execution Service", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class TestCaseInput(BaseModel):
    name: str
    input: str
    expected_output: str
    hidden: bool = False
    weight: int = 1
    check_mode: str = "TRIM"


class ExecuteRequest(BaseModel):
    language: str
    code: str
    mode: str  # "io" | "framework"
    test_cases: list[TestCaseInput] | None = None
    test_code: str | None = None
    time_limit_seconds: int = 5
    memory_limit_mb: int = 128
    pylint_enabled: bool = False
    pylint_min_score: float = 7.0


class ExecuteRawRequest(BaseModel):
    language: str
    code: str
    stdin: str = ""
    time_limit_seconds: int = 5
    memory_limit_mb: int = 128


# ---------------------------------------------------------------------------
# POST /execute
# ---------------------------------------------------------------------------

@app.post("/execute")
def execute(req: ExecuteRequest):
    start = time.monotonic()

    try:
        config = language_registry.get(req.language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        with box_pool.acquire_box() as box_id:
            # Compile
            compile_result = isolate_runner.compile(box_id, config, req.code)
            if not compile_result.success:
                elapsed = int((time.monotonic() - start) * 1000)
                logger.info(
                    "language=%s mode=%s time=%dms compile_error=true",
                    req.language, req.mode, elapsed,
                )
                return {
                    "success": False,
                    "compile_error": compile_result.stderr,
                    "test_results": None,
                    "pylint": None,
                    "execution_time_ms": elapsed,
                }

            # Run tests
            test_result = None
            if req.mode == "io":
                if not req.test_cases:
                    raise HTTPException(
                        status_code=400,
                        detail="test_cases required for mode=io",
                    )
                test_result = test_runner.run_io_tests(
                    box_id, config, req.code,
                    [tc.model_dump() for tc in req.test_cases],
                    req.time_limit_seconds, req.memory_limit_mb,
                )
            elif req.mode == "framework":
                if not req.test_code:
                    raise HTTPException(
                        status_code=400,
                        detail="test_code required for mode=framework",
                    )
                test_result = test_runner.run_framework_tests(
                    box_id, config, req.code, req.test_code,
                    req.time_limit_seconds, req.memory_limit_mb,
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid mode: {req.mode}. Use 'io' or 'framework'",
                )

            # Pylint (Python only)
            pylint_result = None
            if req.pylint_enabled and req.language.lower() == "python":
                pylint_result = run_pylint(req.code, req.pylint_min_score)

            elapsed = int((time.monotonic() - start) * 1000)
            score = test_result.score_percent if test_result else 0

            logger.info(
                "language=%s mode=%s time=%dms score=%.1f%%",
                req.language, req.mode, elapsed, score,
            )

            return {
                "success": True,
                "compile_error": None,
                "test_results": asdict(test_result) if test_result else None,
                "pylint": asdict(pylint_result) if pylint_result else None,
                "execution_time_ms": elapsed,
            }

    except HTTPException:
        raise
    except RuntimeError as e:
        if "Failed to init isolate box" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Execution service busy, try again",
            )
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error during execution", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal error",
        )


# ---------------------------------------------------------------------------
# POST /execute/raw
# ---------------------------------------------------------------------------

@app.post("/execute/raw")
def execute_raw(req: ExecuteRawRequest):
    start = time.monotonic()

    try:
        config = language_registry.get(req.language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        with box_pool.acquire_box() as box_id:
            # Compile if needed
            compile_result = isolate_runner.compile(box_id, config, req.code)
            if not compile_result.success:
                elapsed = int((time.monotonic() - start) * 1000)
                return {
                    "stdout": "",
                    "stderr": compile_result.stderr,
                    "exit_code": 1,
                    "time_ms": elapsed,
                    "memory_kb": 0,
                    "error_message": "Compilation failed",
                }

            # Run
            run_result = isolate_runner.run(
                box_id, config, req.stdin,
                req.time_limit_seconds, req.memory_limit_mb,
            )

            elapsed = int((time.monotonic() - start) * 1000)

            logger.info(
                "language=%s mode=raw time=%dms",
                req.language, elapsed,
            )

            return {
                "stdout": run_result.stdout,
                "stderr": run_result.stderr,
                "exit_code": run_result.meta.get("exit_code", -1),
                "time_ms": elapsed,
                "memory_kb": run_result.meta.get("max_rss", 0),
                "error_message": run_result.error_message,
            }

    except RuntimeError as e:
        if "Failed to init isolate box" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Execution service busy, try again",
            )
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error during raw execution", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal error",
        )


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "languages": ["python", "java", "javascript", "cpp"],
        "versions": {
            "python": "3.14.3",
            "java": "21",
            "node": "24",
            "cpp": "GCC 13 / C++20",
        },
    }


# ---------------------------------------------------------------------------
# GET /languages
# ---------------------------------------------------------------------------

@app.get("/languages")
def languages():
    return [
        {
            "name": "python",
            "display_name": "Python",
            "version": "3.14.3",
            "test_framework": "pytest",
            "supports_pylint": True,
        },
        {
            "name": "java",
            "display_name": "Java",
            "version": "21",
            "test_framework": "junit",
            "supports_pylint": False,
        },
        {
            "name": "javascript",
            "display_name": "JavaScript",
            "version": "Node.js 24",
            "test_framework": "jest",
            "supports_pylint": False,
        },
        {
            "name": "cpp",
            "display_name": "C++",
            "version": "GCC 13 / C++20",
            "test_framework": "gtest",
            "supports_pylint": False,
        },
    ]
