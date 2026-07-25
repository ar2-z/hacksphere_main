from __future__ import annotations

import ast
import re
from dataclasses import dataclass


@dataclass
class CodeQualityMetrics:
    quality_score: float = 0.0
    readability_score: float = 0.0
    efficiency_score: float = 0.0
    issues: list[str] = None
    suggestions: list[str] = None

    def __post_init__(self):
        if self.issues is None:
            self.issues = []
        if self.suggestions is None:
            self.suggestions = []


class CodeEvaluator:
    def evaluate_quality(self, code: str) -> CodeQualityMetrics:
        metrics = CodeQualityMetrics()
        
        try:
            tree = ast.parse(code)
        except SyntaxError:
            metrics.issues.append("Invalid Python syntax")
            return metrics
        
        self._check_naming_conventions(tree, metrics)
        self._check_code_complexity(tree, metrics)
        self._check_code_style(code, metrics)
        self._check_efficiency(tree, metrics)
        
        metrics.quality_score = self._calculate_quality_score(metrics)
        metrics.readability_score = self._calculate_readability_score(metrics)
        metrics.efficiency_score = self._calculate_efficiency_score(metrics)
        
        return metrics

    def _check_naming_conventions(self, tree: ast.AST, metrics: CodeQualityMetrics) -> None:
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if not re.match(r'^[a-z_][a-z0-9_]*$', node.name):
                    metrics.issues.append(f"Function '{node.name}' doesn't follow snake_case")
                    metrics.quality_score -= 5
            
            if isinstance(node, ast.ClassDef):
                if not re.match(r'^[A-Z][a-zA-Z0-9]*$', node.name):
                    metrics.issues.append(f"Class '{node.name}' doesn't follow PascalCase")
                    metrics.quality_score -= 5

    def _check_code_complexity(self, tree: ast.AST, metrics: CodeQualityMetrics) -> None:
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                complexity = self._calculate_cyclomatic_complexity(node)
                if complexity > 10:
                    metrics.issues.append(f"Function '{node.name}' has high complexity ({complexity})")
                    metrics.suggestions.append(f"Consider refactoring '{node.name}' to reduce complexity")
                    metrics.quality_score -= 10

    def _calculate_cyclomatic_complexity(self, node: ast.AST) -> int:
        complexity = 1
        
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
        
        return complexity

    def _check_code_style(self, code: str, metrics: CodeQualityMetrics) -> None:
        lines = code.split('\n')
        
        for i, line in enumerate(lines, 1):
            if len(line) > 79:
                metrics.issues.append(f"Line {i} exceeds 79 characters")
                metrics.quality_score -= 1
            
            if line.rstrip() != line and line.strip():
                metrics.suggestions.append(f"Line {i} has trailing whitespace")
        
        if not code.strip().endswith('\n'):
            metrics.suggestions.append("File doesn't end with a newline")

    def _check_efficiency(self, tree: ast.AST, metrics: CodeQualityMetrics) -> None:
        for node in ast.walk(tree):
            if isinstance(node, ast.For):
                for child in ast.walk(node):
                    if isinstance(child, ast.ListComp):
                        metrics.suggestions.append("Consider using list comprehension instead of for loop")
                        break
            
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute):
                    if node.func.attr == 'append':
                        in_loop = self._is_in_loop(node, tree)
                        if in_loop:
                            metrics.suggestions.append("Consider using list comprehension for better performance")

    def _is_in_loop(self, target_node: ast.AST, tree: ast.AST) -> bool:
        for node in ast.walk(tree):
            if isinstance(node, (ast.For, ast.While)):
                for child in ast.walk(node):
                    if child is target_node:
                        return True
        return False

    def _calculate_quality_score(self, metrics: CodeQualityMetrics) -> float:
        score = 100.0
        
        score -= len(metrics.issues) * 5
        
        if len(metrics.suggestions) > 5:
            score -= 10
        
        return max(0.0, min(100.0, score))

    def _calculate_readability_score(self, metrics: CodeQualityMetrics) -> float:
        score = 100.0
        
        naming_issues = sum(1 for issue in metrics.issues if "naming" in issue.lower() or "snake_case" in issue or "PascalCase" in issue)
        score -= naming_issues * 10
        
        style_issues = sum(1 for issue in metrics.issues if "line" in issue.lower() or "character" in issue.lower())
        score -= style_issues * 5
        
        return max(0.0, min(100.0, score))

    def _calculate_efficiency_score(self, metrics: CodeQualityMetrics) -> float:
        score = 100.0
        
        efficiency_suggestions = sum(1 for s in metrics.suggestions if "performance" in s.lower() or "comprehension" in s.lower())
        score -= efficiency_suggestions * 15
        
        return max(0.0, min(100.0, score))
