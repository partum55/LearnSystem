import logging
import subprocess
import threading
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class BoxPool:
    """Thread-safe pool of Isolate box IDs (0-99)."""

    def __init__(self, max_boxes: int = 100):
        self._semaphore = threading.Semaphore(max_boxes)
        self._lock = threading.Lock()
        self._available: set[int] = set(range(max_boxes))

    def acquire(self) -> int:
        self._semaphore.acquire()
        with self._lock:
            box_id = self._available.pop()

        try:
            result = subprocess.run(
                ["isolate", f"--box-id={box_id}", "--init"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"Failed to init isolate box {box_id}: {result.stderr}"
                )
        except Exception:
            with self._lock:
                self._available.add(box_id)
            self._semaphore.release()
            raise

        return box_id

    def release(self, box_id: int) -> None:
        try:
            subprocess.run(
                ["isolate", f"--box-id={box_id}", "--cleanup"],
                capture_output=True,
                text=True,
                timeout=10,
            )
        except Exception as e:
            logger.warning("Failed to cleanup box %d: %s", box_id, e)

        with self._lock:
            self._available.add(box_id)
        self._semaphore.release()

    @contextmanager
    def acquire_box(self):
        box_id = self.acquire()
        try:
            yield box_id
        finally:
            self.release(box_id)
