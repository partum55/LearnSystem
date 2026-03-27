import pathlib


def parse_meta(path: str) -> dict:
    """Parse Isolate meta file (key:value per line) into a typed dict."""
    result: dict = {
        "time": 0.0,
        "time_wall": 0.0,
        "max_rss": 0,
        "exit_code": 0,
        "status": None,
        "killed": False,
        "message": None,
    }

    meta_path = pathlib.Path(path)
    if not meta_path.exists():
        return result

    for line in meta_path.read_text().strip().splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue

        key, _, value = line.partition(":")

        match key:
            case "time":
                result["time"] = float(value)
            case "time-wall":
                result["time_wall"] = float(value)
            case "max-rss":
                result["max_rss"] = int(value)
            case "exitcode":
                result["exit_code"] = int(value)
            case "status":
                result["status"] = value.strip()
            case "killed":
                result["killed"] = value.strip() == "1"
            case "message":
                result["message"] = value.strip()

    return result
