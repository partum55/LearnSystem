import json
import logging
from collections import deque


# In-memory log buffer to capture recent Django/server logs during tests
_log_buffer = deque(maxlen=1000)


class _ListHandler(logging.Handler):
    """Custom logging handler that appends formatted log records to an in-memory buffer."""

    def emit(self, record):
        try:
            msg = self.format(record)
        except Exception:
            msg = record.getMessage()
        _log_buffer.append(msg)


# Install the handler on the root logger (if not already installed)
_root_logger = logging.getLogger()
_handler_name = 'tests_integration_list_handler'
has_handler = any(getattr(h, 'name', None) == _handler_name for h in _root_logger.handlers)
if not has_handler:
    handler = _ListHandler()
    handler.setLevel(logging.DEBUG)
    handler.name = _handler_name
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
    handler.setFormatter(formatter)
    _root_logger.addHandler(handler)


def get_captured_logs(max_lines=200):
    """Return the most recent captured log lines as a single string."""
    if not _log_buffer:
        return ''
    lines = list(_log_buffer)[-max_lines:]
    return '\n'.join(lines)


def clear_captured_logs():
    """Clear the in-memory log buffer."""
    _log_buffer.clear()


def assert_no_error_in_response(resp, allowed_statuses=(200, 201, 202, 204)):
    """Assert response status is in allowed list and JSON body does not contain obvious error keys.

    If an assertion fails, attach recent captured server logs to the AssertionError message to aid debugging.
    """
    status = resp.status_code
    if status not in allowed_statuses:
        logs = get_captured_logs()
        clear_captured_logs()
        raise AssertionError(f"Unexpected status code: {status} (allowed: {allowed_statuses}). Body: {getattr(resp, 'text', None)}\n\nRecent server logs:\n{logs}")

    # Only check JSON bodies
    content_type = resp.headers.get('Content-Type', '')
    if 'application/json' not in content_type and content_type:
        # skip non-json responses
        clear_captured_logs()
        return

    try:
        data = resp.json()
    except Exception:
        # Not JSON or empty, nothing more to check
        clear_captured_logs()
        return

    # If it's a paginated structure, drill into results
    if isinstance(data, dict) and 'results' in data and isinstance(data['results'], (list, dict)):
        # check top-level for errors as well
        if 'error' in data or 'detail' in data:
            logs = get_captured_logs()
            clear_captured_logs()
            raise AssertionError(f"Error present in response JSON: {data}\n\nRecent server logs:\n{logs}")
        # check items
        for item in (data['results'] if isinstance(data['results'], list) else [data['results']]):
            if isinstance(item, dict) and ('error' in item or 'detail' in item):
                logs = get_captured_logs()
                clear_captured_logs()
                raise AssertionError(f"Error present in paginated results: {item}\n\nRecent server logs:\n{logs}")
        clear_captured_logs()
        return

    if isinstance(data, dict):
        if 'error' in data:
            logs = get_captured_logs()
            clear_captured_logs()
            raise AssertionError(f"Error present in response JSON: {data['error']}\n\nRecent server logs:\n{logs}")
        if 'detail' in data and data.get('detail') is not None:
            # Some endpoints return detail for expected responses; treat as error to be safe
            logs = get_captured_logs()
            clear_captured_logs()
            raise AssertionError(f"Detail present in response JSON: {data.get('detail')}\n\nRecent server logs:\n{logs}")

    # If it's a list, check each item isn't an error wrapper
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and ('error' in item or 'detail' in item):
                logs = get_captured_logs()
                clear_captured_logs()
                raise AssertionError(f"Error present in list response: {item}\n\nRecent server logs:\n{logs}")

    # Success path: clear logs to avoid cross-test leakage
    clear_captured_logs()


__all__ = ['assert_no_error_in_response', 'get_captured_logs', 'clear_captured_logs']
