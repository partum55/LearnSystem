import json
import logging
import pathlib
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

import isolate_runner
from language_registry import LanguageConfig

logger = logging.getLogger(__name__)


@dataclass
class TestCaseResult:
    name: str
    passed: bool
    hidden: bool = False
    error_message: str | None = None
    execution_time_ms: int = 0
    actual_output: str | None = None
    expected_output: str | None = None


@dataclass
class TestSuiteResult:
    passed: int
    total: int
    score_percent: float
    results: list[TestCaseResult] = field(default_factory=list)


def _box_dir(box_id: int) -> pathlib.Path:
    return pathlib.Path(f"/var/local/lib/isolate/{box_id}/box")


# ---------------------------------------------------------------------------
# IO test mode
# ---------------------------------------------------------------------------

def run_io_tests(
    box_id: int,
    config: LanguageConfig,
    student_code: str,
    test_cases: list[dict],
    time_limit_sec: int,
    memory_limit_mb: int,
) -> TestSuiteResult:
    # Compile once
    compile_result = isolate_runner.compile(box_id, config, student_code)
    if not compile_result.success:
        return _all_failed(test_cases, compile_result.stderr)

    results: list[TestCaseResult] = []

    for tc in test_cases:
        name = tc.get("name", "Unnamed test")
        input_data = tc.get("input", "")
        expected = tc.get("expected_output", "")
        hidden = tc.get("hidden", False)
        weight = tc.get("weight", 1)
        check_mode = tc.get("check_mode", "TRIM")

        run_result = isolate_runner.run(
            box_id, config, input_data, time_limit_sec, memory_limit_mb
        )

        if run_result.error_message:
            results.append(TestCaseResult(
                name=name,
                passed=False,
                hidden=hidden,
                error_message=run_result.error_message,
                execution_time_ms=int(run_result.meta.get("time_wall", 0) * 1000),
                actual_output=None if hidden else run_result.stdout,
                expected_output=None if hidden else expected,
            ))
            continue

        actual = run_result.stdout
        passed = _check_output(actual, expected, check_mode)

        results.append(TestCaseResult(
            name=name,
            passed=passed,
            hidden=hidden,
            error_message=run_result.stderr if not passed and run_result.stderr else None,
            execution_time_ms=int(run_result.meta.get("time_wall", 0) * 1000),
            actual_output=None if hidden else actual,
            expected_output=None if hidden else expected,
        ))

    return _build_suite(results, test_cases)


def _check_output(actual: str, expected: str, check_mode: str) -> bool:
    match check_mode.upper():
        case "EXACT":
            return actual == expected
        case "TRIM":
            return actual.strip() == expected.strip()
        case "CONTAINS":
            return expected.strip() in actual
        case "REGEX":
            return re.search(expected, actual) is not None
        case _:
            return actual.strip() == expected.strip()


def _all_failed(test_cases: list[dict], error: str) -> TestSuiteResult:
    results = [
        TestCaseResult(
            name=tc.get("name", f"Test {i + 1}"),
            passed=False,
            hidden=tc.get("hidden", False),
            error_message=error,
        )
        for i, tc in enumerate(test_cases)
    ]
    return TestSuiteResult(passed=0, total=len(test_cases), score_percent=0.0, results=results)


# ---------------------------------------------------------------------------
# Framework test mode
# ---------------------------------------------------------------------------

def run_framework_tests(
    box_id: int,
    config: LanguageConfig,
    student_code: str,
    test_code: str,
    time_limit_sec: int,
    memory_limit_mb: int,
) -> TestSuiteResult:
    match config.test_framework:
        case "pytest":
            return _run_pytest(box_id, config, student_code, test_code, time_limit_sec, memory_limit_mb)
        case "junit":
            return _run_junit(box_id, config, student_code, test_code, time_limit_sec, memory_limit_mb)
        case "jest":
            return _run_jest(box_id, config, student_code, test_code, time_limit_sec, memory_limit_mb)
        case "gtest":
            return _run_gtest(box_id, config, student_code, test_code, time_limit_sec, memory_limit_mb)
        case _:
            raise ValueError(f"Unknown test framework: {config.test_framework}")


# --- pytest ---

def _run_pytest(
    box_id: int, config: LanguageConfig,
    student_code: str, test_code: str,
    time_limit_sec: int, memory_limit_mb: int,
) -> TestSuiteResult:
    box_dir = _box_dir(box_id)
    (box_dir / "solution.py").write_text(student_code)
    (box_dir / "tests.py").write_text(test_code)

    run_result = isolate_runner.run(
        box_id,
        LanguageConfig(
            name="pytest",
            source_filename="solution.py",
            compile_cmd=None,
            run_cmd=[
                "python3.14", "-m", "pytest", "tests.py",
                "--json-report", "--json-report-file=report.json",
                "-v", "--tb=short",
            ],
            test_framework="pytest",
        ),
        stdin="",
        time_limit_sec=time_limit_sec,
        memory_limit_mb=memory_limit_mb,
    )

    report_path = box_dir / "report.json"
    if not report_path.exists():
        return TestSuiteResult(
            passed=0, total=1, score_percent=0.0,
            results=[TestCaseResult(
                name="pytest",
                passed=False,
                error_message=run_result.stderr or run_result.error_message or "No report generated",
            )],
        )

    report = json.loads(report_path.read_text())
    results: list[TestCaseResult] = []

    for test in report.get("tests", []):
        nodeid = test.get("nodeid", "unknown")
        outcome = test.get("outcome", "failed")
        duration = test.get("duration", 0)
        longrepr = None
        if outcome != "passed":
            call_info = test.get("call", {})
            longrepr = call_info.get("longrepr", None)

        results.append(TestCaseResult(
            name=nodeid,
            passed=outcome == "passed",
            error_message=longrepr,
            execution_time_ms=int(duration * 1000),
        ))

    passed = sum(1 for r in results if r.passed)
    total = len(results) or 1
    return TestSuiteResult(
        passed=passed, total=total,
        score_percent=passed / total * 100,
        results=results,
    )


# --- JUnit ---

def _run_junit(
    box_id: int, config: LanguageConfig,
    student_code: str, test_code: str,
    time_limit_sec: int, memory_limit_mb: int,
) -> TestSuiteResult:
    box_dir = _box_dir(box_id)
    (box_dir / "Solution.java").write_text(student_code)
    (box_dir / "SolutionTest.java").write_text(test_code)

    # Compile
    compile_result = isolate_runner.compile(
        box_id,
        LanguageConfig(
            name="junit-compile",
            source_filename="Solution.java",
            compile_cmd=[
                "javac", "-cp", "/opt/junit.jar:/opt/lombok.jar",
                "-processorpath", "/opt/lombok.jar",
                "Solution.java", "SolutionTest.java",
            ],
            run_cmd=[],
            test_framework="junit",
        ),
        student_code,
    )
    if not compile_result.success:
        return TestSuiteResult(
            passed=0, total=1, score_percent=0.0,
            results=[TestCaseResult(name="compilation", passed=False, error_message=compile_result.stderr)],
        )

    # Run JUnit
    run_result = isolate_runner.run(
        box_id,
        LanguageConfig(
            name="junit-run",
            source_filename="Solution.java",
            compile_cmd=None,
            run_cmd=[
                "java", "-cp", ".:/opt/junit.jar:/opt/lombok.jar",
                "org.junit.platform.console.ConsoleLauncher",
                "--scan-classpath",
                "--details=tree",
                "--reports-dir=reports",
            ],
            test_framework="junit",
        ),
        stdin="",
        time_limit_sec=time_limit_sec,
        memory_limit_mb=memory_limit_mb,
    )

    # Parse Surefire XML
    reports_dir = box_dir / "reports"
    results: list[TestCaseResult] = []

    if reports_dir.exists():
        for xml_file in reports_dir.glob("TEST-*.xml"):
            try:
                tree = ET.parse(xml_file)
                root = tree.getroot()
                for testcase in root.iter("testcase"):
                    name = f"{testcase.get('classname', '')}.{testcase.get('name', '')}"
                    time_s = float(testcase.get("time", 0))
                    failure = testcase.find("failure")
                    error = testcase.find("error")
                    err_msg = None
                    if failure is not None:
                        err_msg = failure.get("message", failure.text)
                    elif error is not None:
                        err_msg = error.get("message", error.text)

                    results.append(TestCaseResult(
                        name=name,
                        passed=failure is None and error is None,
                        error_message=err_msg,
                        execution_time_ms=int(time_s * 1000),
                    ))
            except ET.ParseError as e:
                logger.error("Failed to parse JUnit XML %s: %s", xml_file, e)

    if not results:
        results.append(TestCaseResult(
            name="junit",
            passed=False,
            error_message=run_result.stderr or run_result.error_message or "No test results found",
        ))

    passed = sum(1 for r in results if r.passed)
    total = len(results)
    return TestSuiteResult(
        passed=passed, total=total,
        score_percent=passed / total * 100,
        results=results,
    )


# --- Jest ---

def _run_jest(
    box_id: int, config: LanguageConfig,
    student_code: str, test_code: str,
    time_limit_sec: int, memory_limit_mb: int,
) -> TestSuiteResult:
    box_dir = _box_dir(box_id)
    (box_dir / "solution.js").write_text(student_code)
    (box_dir / "tests.js").write_text(test_code)
    (box_dir / "package.json").write_text(json.dumps({
        "jest": {"testMatch": ["**/tests.js"]}
    }))

    run_result = isolate_runner.run(
        box_id,
        LanguageConfig(
            name="jest",
            source_filename="solution.js",
            compile_cmd=None,
            run_cmd=[
                "node", "/usr/local/lib/node_modules/jest/bin/jest.js",
                "--no-coverage", "--json",
                "--outputFile=report.json", "tests.js",
            ],
            test_framework="jest",
        ),
        stdin="",
        time_limit_sec=time_limit_sec,
        memory_limit_mb=memory_limit_mb,
    )

    report_path = box_dir / "report.json"
    if not report_path.exists():
        return TestSuiteResult(
            passed=0, total=1, score_percent=0.0,
            results=[TestCaseResult(
                name="jest",
                passed=False,
                error_message=run_result.stderr or run_result.error_message or "No report generated",
            )],
        )

    report = json.loads(report_path.read_text())
    results: list[TestCaseResult] = []

    for test_suite in report.get("testResults", []):
        for assertion in test_suite.get("assertionResults", []):
            full_name = assertion.get("fullName", "unknown")
            status = assertion.get("status", "failed")
            failure_msgs = assertion.get("failureMessages", [])
            duration = assertion.get("duration", 0)

            results.append(TestCaseResult(
                name=full_name,
                passed=status == "passed",
                error_message="\n".join(failure_msgs) if failure_msgs else None,
                execution_time_ms=duration or 0,
            ))

    if not results:
        results.append(TestCaseResult(
            name="jest",
            passed=False,
            error_message="No test results found",
        ))

    passed = sum(1 for r in results if r.passed)
    total = len(results)
    return TestSuiteResult(
        passed=passed, total=total,
        score_percent=passed / total * 100,
        results=results,
    )


# --- GTest ---

def _run_gtest(
    box_id: int, config: LanguageConfig,
    student_code: str, test_code: str,
    time_limit_sec: int, memory_limit_mb: int,
) -> TestSuiteResult:
    box_dir = _box_dir(box_id)
    (box_dir / "impl.cpp").write_text(student_code)
    (box_dir / "tests.cpp").write_text(test_code)

    # Compile
    compile_result = isolate_runner.compile(
        box_id,
        LanguageConfig(
            name="gtest-compile",
            source_filename="impl.cpp",
            compile_cmd=[
                "g++", "-std=c++20", "-O2",
                "-o", "solution", "tests.cpp",
                "-lgtest", "-lgtest_main", "-lpthread",
            ],
            run_cmd=[],
            test_framework="gtest",
        ),
        student_code,
    )
    if not compile_result.success:
        return TestSuiteResult(
            passed=0, total=1, score_percent=0.0,
            results=[TestCaseResult(name="compilation", passed=False, error_message=compile_result.stderr)],
        )

    # Run
    run_result = isolate_runner.run(
        box_id,
        LanguageConfig(
            name="gtest-run",
            source_filename="impl.cpp",
            compile_cmd=None,
            run_cmd=["./solution", "--gtest_output=json:report.json"],
            test_framework="gtest",
        ),
        stdin="",
        time_limit_sec=time_limit_sec,
        memory_limit_mb=memory_limit_mb,
    )

    report_path = box_dir / "report.json"
    if not report_path.exists():
        return TestSuiteResult(
            passed=0, total=1, score_percent=0.0,
            results=[TestCaseResult(
                name="gtest",
                passed=False,
                error_message=run_result.stderr or run_result.error_message or "No report generated",
            )],
        )

    report = json.loads(report_path.read_text())
    results: list[TestCaseResult] = []

    for suite in report.get("testsuites", []):
        for test in suite.get("testsuite", []):
            name = f"{suite.get('name', '')}.{test.get('name', '')}"
            status = test.get("result", "COMPLETED")
            failures = test.get("failures", [])
            time_s = float(test.get("time", "0").rstrip("s"))

            err_msg = None
            if failures:
                err_msg = "\n".join(f.get("failure", "") for f in failures)

            results.append(TestCaseResult(
                name=name,
                passed=len(failures) == 0,
                error_message=err_msg,
                execution_time_ms=int(time_s * 1000),
            ))

    if not results:
        results.append(TestCaseResult(
            name="gtest",
            passed=False,
            error_message="No test results found",
        ))

    passed = sum(1 for r in results if r.passed)
    total = len(results)
    return TestSuiteResult(
        passed=passed, total=total,
        score_percent=passed / total * 100,
        results=results,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_suite(results: list[TestCaseResult], test_cases: list[dict]) -> TestSuiteResult:
    total_weight = 0
    passed_weight = 0

    for i, r in enumerate(results):
        weight = test_cases[i].get("weight", 1) if i < len(test_cases) else 1
        total_weight += weight
        if r.passed:
            passed_weight += weight

    passed = sum(1 for r in results if r.passed)
    total = len(results)
    score = (passed_weight / total_weight * 100) if total_weight > 0 else 0.0

    return TestSuiteResult(
        passed=passed,
        total=total,
        score_percent=round(score, 2),
        results=results,
    )
