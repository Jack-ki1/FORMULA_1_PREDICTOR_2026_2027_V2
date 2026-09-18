import sys, os
# Ensure project root is on sys.path so `import engine`, `import dashboard` works
# whether running `pytest`, `uv run pytest`, or `python -m pytest`.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
