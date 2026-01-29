"""
Logger - Centralized logging for LeadPilot

Provides structured logging with file rotation and different log levels.
"""

import os
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler


def setup_logger(name: str = "leadpilot", log_dir: str = "logs", level: str = "INFO") -> logging.Logger:
    """
    Setup centralized logger with file and console output.
    
    Args:
        name: Logger name
        log_dir: Directory for log files
        level: Log level (DEBUG, INFO, WARNING, ERROR)
        
    Returns:
        Configured logger instance
    """
    # Create logs directory
    os.makedirs(log_dir, exist_ok=True)
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # File handler with rotation (10MB max, keep 5 backups)
    log_file = os.path.join(log_dir, f"{name}.log")
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


def log_pipeline_start(logger: logging.Logger, city: str, category: str, limit: int):
    """Log pipeline start."""
    logger.info("="*60)
    logger.info(f"Pipeline started: {category} in {city} (limit: {limit})")
    logger.info("="*60)


def log_pipeline_complete(logger: logging.Logger, leads_count: int, output_path: str):
    """Log pipeline completion."""
    logger.info("="*60)
    logger.info(f"Pipeline completed: {leads_count} leads generated")
    logger.info(f"Output: {output_path}")
    logger.info("="*60)


def log_error(logger: logging.Logger, error: Exception, context: str = ""):
    """Log error with context."""
    logger.error(f"Error in {context}: {type(error).__name__}: {str(error)}")
    logger.debug("Full traceback:", exc_info=True)


# Create default logger
default_logger = setup_logger()
