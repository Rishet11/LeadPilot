#!/usr/bin/env python3
"""LeadPilot durable job worker entry point."""

import os

from api.worker import run_worker


if __name__ == "__main__":
    poll = float(os.getenv("LEADPILOT_WORKER_POLL_SECONDS", "2.0"))
    run_worker(poll_interval=poll)
