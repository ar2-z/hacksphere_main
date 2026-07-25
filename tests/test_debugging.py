import pytest
from app.infrastructure.sandbox.executor import CodeExecutor
from app.infrastructure.sandbox.evaluator import CodeEvaluator


@pytest.fixture
def executor():
    return CodeExecutor()


@pytest.fixture
def evaluator():
    return CodeEvaluator()


def test_validate_code_valid(executor):
    code = """
def add(a, b):
    return a + b
"""
    is_valid, message = executor.validate_code(code)
    assert is_valid is True
    assert message == "Code is valid"


def test_validate_code_invalid_import(executor):
    code = """
import os
os.system("rm -rf /")
"""
    is_valid, message = executor.validate_code(code)
    assert is_valid is False
    assert "not allowed" in message


def test_validate_code_syntax_error(executor):
    code = """
def add(a, b):
    return a +
"""
    is_valid, message = executor.validate_code(code)
    assert is_valid is False
    assert "Syntax error" in message


def test_evaluate_quality_good_code(evaluator):
    code = """
def calculate_sum(numbers: list[int]) -> int:
    total = 0
    for num in numbers:
        total += num
    return total
"""
    metrics = evaluator.evaluate_quality(code)
    assert metrics.quality_score > 80
    assert metrics.readability_score > 80


def test_evaluate_quality_bad_naming(evaluator):
    code = """
def MyFunction():
    pass
"""
    metrics = evaluator.evaluate_quality(code)
    assert len(metrics.issues) > 0
