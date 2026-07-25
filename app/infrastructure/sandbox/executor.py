from __future__ import annotations

import ast
import asyncio
import io
import signal
import sys
import traceback
from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings


@dataclass
class ExecutionResult:
    success: bool
    output: str = ""
    error: str = ""
    execution_time_ms: float = 0.0
    memory_used_mb: float = 0.0
    return_value: Any = None
    test_results: list[dict[str, Any]] = field(default_factory=list)


class CodeExecutor:
    def __init__(
        self,
        timeout_seconds: int | None = None,
        memory_limit_mb: int | None = None,
    ) -> None:
        self.timeout_seconds = timeout_seconds or settings.CODE_EXECUTION_TIMEOUT
        self.memory_limit_mb = memory_limit_mb or settings.CODE_MEMORY_LIMIT_MB

    def validate_code(self, code: str) -> tuple[bool, str]:
        try:
            tree = ast.parse(code)
            
            dangerous_nodes = [
                ast.Import, ast.ImportFrom,
            ]
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name.startswith(('os', 'subprocess', 'shutil', 'sys')):
                            return False, f"Import of '{alias.name}' is not allowed"
                
                if isinstance(node, ast.ImportFrom):
                    if node.module and node.module.startswith(('os', 'subprocess', 'shutil', 'sys')):
                        return False, f"Import from '{node.module}' is not allowed"
                
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Attribute):
                        if node.func.attr in ('system', 'popen', 'exec', 'eval', 'compile'):
                            return False, f"Call to '{node.func.attr}' is not allowed"
                    if isinstance(node.func, ast.Name):
                        if node.func.id in ('exec', 'eval', 'compile', '__import__'):
                            return False, f"Call to '{node.func.id}' is not allowed"
            
            return True, "Code is valid"
        
        except SyntaxError as e:
            return False, f"Syntax error: {e}"

    async def execute_code(
        self,
        code: str,
        test_input: str = "",
        expected_output: str = "",
    ) -> ExecutionResult:
        is_valid, message = self.validate_code(code)
        if not is_valid:
            return ExecutionResult(
                success=False,
                error=message,
            )

        try:
            result = await asyncio.wait_for(
                self._run_code(code, test_input, expected_output),
                timeout=self.timeout_seconds,
            )
            return result
        except asyncio.TimeoutError:
            return ExecutionResult(
                success=False,
                error=f"Execution timed out after {self.timeout_seconds} seconds",
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                error=f"Execution error: {str(e)}",
            )

    async def _run_code(
        self,
        code: str,
        test_input: str,
        expected_output: str,
    ) -> ExecutionResult:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        redirected_output = io.StringIO()
        redirected_error = io.StringIO()

        sys.stdout = redirected_output
        sys.stderr = redirected_error

        try:
            local_vars: dict[str, Any] = {}
            
            if test_input:
                original_input = __builtins__.__dict__.get('input')
                input_values = test_input.strip().split('\n')
                input_index = [0]
                
                def mock_input(prompt: str = "") -> str:
                    if input_index[0] < len(input_values):
                        value = input_values[input_index[0]]
                        input_index[0] += 1
                        return value
                    return ""
                
                import builtins
                builtins.input = mock_input

            exec(code, {"__builtins__": __builtins__}, local_vars)

            output = redirected_output.getvalue()
            error = redirected_error.getvalue()

            success = True
            if expected_output:
                success = output.strip() == expected_output.strip()

            return ExecutionResult(
                success=success,
                output=output,
                error=error,
                return_value=local_vars.get('result'),
            )

        except Exception as e:
            return ExecutionResult(
                success=False,
                output=redirected_output.getvalue(),
                error=traceback.format_exc(),
            )
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            
            if test_input:
                import builtins
                if hasattr(builtins, '_original_input'):
                    builtins.input = builtins._original_input

    async def run_test_cases(
        self,
        code: str,
        test_cases: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        results = []
        
        for test_case in test_cases:
            result = await self.execute_code(
                code=code,
                test_input=test_case.get("input_data", ""),
                expected_output=test_case.get("expected_output", ""),
            )
            
            results.append({
                "test_case_id": test_case.get("id"),
                "name": test_case.get("name"),
                "passed": result.success,
                "output": result.output,
                "expected": test_case.get("expected_output", ""),
                "error": result.error if not result.success else "",
                "points": test_case.get("points", 0) if result.success else 0,
            })
        
        return results
