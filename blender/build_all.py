"""Builds every character. Optional names limit the run.
Run: blender --background --python blender/build_all.py -- [investigator] [echo] [ghost]
"""
import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ALL = ("investigator", "partner", "byte", "echo", "ghost")
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

for name in args or ALL:
    print("=== Building", name)
    importlib.import_module(name).build()
print("BUILD_ALL_DONE")
