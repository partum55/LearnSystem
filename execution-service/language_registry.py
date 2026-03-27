from dataclasses import dataclass


@dataclass
class LanguageConfig:
    name: str
    source_filename: str
    compile_cmd: list[str] | None
    run_cmd: list[str]
    test_framework: str  # "pytest" | "junit" | "jest" | "gtest" | "io"


_REGISTRY: dict[str, LanguageConfig] = {
    "python": LanguageConfig(
        name="python",
        source_filename="solution.py",
        compile_cmd=None,
        run_cmd=["python3.14", "solution.py"],
        test_framework="pytest",
    ),
    "java": LanguageConfig(
        name="java",
        source_filename="Solution.java",
        compile_cmd=[
            "javac",
            "-cp", "/opt/lombok.jar",
            "-processorpath", "/opt/lombok.jar",
            "Solution.java",
        ],
        run_cmd=[
            "java",
            "-cp", ".:/opt/lombok.jar",
            "Solution",
        ],
        test_framework="junit",
    ),
    "javascript": LanguageConfig(
        name="javascript",
        source_filename="solution.js",
        compile_cmd=None,
        run_cmd=["node", "solution.js"],
        test_framework="jest",
    ),
    "cpp": LanguageConfig(
        name="cpp",
        source_filename="main.cpp",
        compile_cmd=[
            "g++", "-std=c++20", "-O2",
            "-o", "solution", "main.cpp",
            "-lgtest", "-lgtest_main", "-lpthread",
        ],
        run_cmd=["./solution"],
        test_framework="gtest",
    ),
}


def get(name: str) -> LanguageConfig:
    config = _REGISTRY.get(name.lower())
    if config is None:
        supported = ", ".join(sorted(_REGISTRY.keys()))
        raise ValueError(
            f"Unsupported language: {name}. Supported: {supported}"
        )
    return config
