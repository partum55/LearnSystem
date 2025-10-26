#!/usr/bin/env python3
"""
Simple heartbeat pinger.

Usage:
  - Configure target URL and method via env vars HEARTBEAT_URL, HEARTBEAT_METHOD
  - Default interval is 30 seconds via HEARTBEAT_INTERVAL
  - Run once for testing: python heartbeat.py --once

This script logs results to stdout and exits non-zero if a one-shot run fails.
"""
import os
import time
import argparse
import logging
import sys
from typing import Optional

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("heartbeat")

DEFAULT_URL = os.environ.get("HEARTBEAT_URL", "https://httpbin.org/status/200")
DEFAULT_METHOD = os.environ.get("HEARTBEAT_METHOD", "GET").upper()
DEFAULT_INTERVAL = int(os.environ.get("HEARTBEAT_INTERVAL", "30"))
DEFAULT_RETRIES = int(os.environ.get("HEARTBEAT_RETRIES", "3"))
DEFAULT_BACKOFF = int(os.environ.get("HEARTBEAT_BACKOFF", "2"))


def send_heartbeat(url: str, method: str = "GET", timeout: int = 10) -> Optional[int]:
    try:
        if method == "GET":
            r = requests.get(url, timeout=timeout)
        elif method == "POST":
            r = requests.post(url, json={"ping": True}, timeout=timeout)
        else:
            logger.error("Unsupported method: %s", method)
            return None
        logger.info("Heartbeat sent (%s %s) -> %s", method, url, r.status_code)
        return r.status_code
    except requests.RequestException as e:
        logger.warning("Heartbeat failed: %s", e)
        return None


def send_with_retries(url: str, method: str = "GET", retries: int = 3, backoff: int = 2) -> Optional[int]:
    attempt = 0
    while attempt < retries:
        status = send_heartbeat(url, method)
        if status and 200 <= status < 300:
            return status
        attempt += 1
        sleep_for = backoff ** attempt
        logger.info("Retrying in %ss (attempt %s/%s)", sleep_for, attempt, retries)
        time.sleep(sleep_for)
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Send one heartbeat and exit (return non-zero on failure)")
    parser.add_argument("--url", type=str, default=DEFAULT_URL, help="Heartbeat URL")
    parser.add_argument("--method", type=str, default=DEFAULT_METHOD, help="HTTP method (GET/POST)")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help="Interval seconds between heartbeats")
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES, help="Number of retries for one-shot")
    parser.add_argument("--backoff", type=int, default=DEFAULT_BACKOFF, help="Base backoff seconds (exponential)")
    args = parser.parse_args()

    url = args.url
    method = args.method.upper()
    interval = args.interval

    if args.once:
        status = send_with_retries(url, method, retries=args.retries, backoff=args.backoff)
        if status and 200 <= status < 300:
            logger.info("One-shot heartbeat success")
            sys.exit(0)
        else:
            logger.error("One-shot heartbeat failed after %s attempts", args.retries)
            sys.exit(2)

    logger.info("Starting heartbeat: %s %s every %ss", method, url, interval)
    try:
        while True:
            send_with_retries(url, method, retries=DEFAULT_RETRIES, backoff=DEFAULT_BACKOFF)
            time.sleep(interval)
    except KeyboardInterrupt:
        logger.info("Heartbeat stopped by user")


if __name__ == "__main__":
    main()
