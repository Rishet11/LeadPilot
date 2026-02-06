"""
Logger - Centralized logging for LeadPilot

Provides structured JSON logging with request tracing for better observability.
"""

import os
import sys
import logging
from typing import Any
from logging.handlers import RotatingFileHandler

import structlog


def setup_logger(
    name: str = "leadpilot",
    log_dir: str = "logs",
    level: str = "INFO",
    json_output: bool = None
) -> structlog.stdlib.BoundLogger:
    """
    Setup centralized structured logger with file and console output.

    Args:
        name: Logger name
        log_dir: Directory for log files
        level: Log level (DEBUG, INFO, WARNING, ERROR)
        json_output: Force JSON format (auto-detects if running in container)

    Returns:
        Configured structlog logger instance
    """
    # Create logs directory
    os.makedirs(log_dir, exist_ok=True)

    # Auto-detect if we should use JSON (production/container)
    if json_output is None:
        json_output = os.getenv("ENVIRONMENT", "").lower() in ("production", "staging")

    # Configure structlog processors
    shared_processors = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if json_output:
        # JSON output for production
        renderer = structlog.processors.JSONRenderer()
    else:
        # Colored console output for development
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=shared_processors + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Standard library logger config
    log_level = getattr(logging, level.upper())
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers
    root_logger.handlers.clear()

    # Formatter using structlog
    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    root_logger.addHandler(console_handler)

    # File handler with rotation (10MB max, keep 5 backups)
    log_file = os.path.join(log_dir, f"{name}.log")
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)
    root_logger.addHandler(file_handler)

    # Return structured logger
    return structlog.get_logger(name)


def get_logger(name: str = "leadpilot") -> structlog.stdlib.BoundLogger:
    """Get a named logger instance."""
    return structlog.get_logger(name)


def log_with_context(logger: Any, level: str, message: str, **context):
    """Log a message with additional context."""
    log_method = getattr(logger, level.lower(), logger.info)
    log_method(message, **context)


# Initialize default logger on import
default_logger = setup_logger()
