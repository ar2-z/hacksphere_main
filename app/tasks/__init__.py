from app.tasks.quiz import evaluate_quiz_round, reveal_clue_after_round
from app.tasks.debugging import evaluate_submission, auto_end_challenge

__all__ = [
    "evaluate_quiz_round",
    "reveal_clue_after_round",
    "evaluate_submission",
    "auto_end_challenge",
]
