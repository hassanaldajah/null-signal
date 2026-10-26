"""Antagonist "The Ghost": voxel investigator gone wrong. Black suit and coat, hood,
black mask with red eye pixels, floating red glitch pixels.
Run: blender --background --python blender/ghost.py
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import ns_common as ns  # noqa: E402
import voxel_detective as vd  # noqa: E402


def glitch_actions(rig):
    """Adds the "glitch" twitch clip and an "orbit" clip for the floating pixels."""
    random.seed(13)
    keys = {1: {}}
    for frame in range(2, 25):
        if frame % 5 == 0:
            keys[frame] = {}
            continue
        keys[frame] = {
            "root": {"loc": (random.uniform(-0.04, 0.04), 0, random.uniform(0, 0.02))},
            "spine": {"rot": (0, 0, random.uniform(-0.1, 0.1))},
            "head": {"rot": (random.uniform(-0.2, 0.2), 0, random.uniform(-0.35, 0.35))},
            "glitch": {"scale": random.uniform(0.4, 1.8), "spin": ((0, 0, 1), random.uniform(-1, 1))},
        }
    keys[26] = {}
    ns.animate(rig, "glitch", keys)
    ns.animate(rig, "orbit", {1 + i * 15: {"glitch": {"spin": ((0, 0, 1), 2 * math.pi * i / 6)}} for i in range(7)})


def build():
    vd.build(
        vd.Look(name="ghost", skin="#1a1a1f", hair_style="none", suit="#0b0b0e", shirt="#101013",
                tie="#2a0006", coat="#08080a", lapel="#111114", eyewear="none", hat="", ghost=True, scale=1.04),
        extra_actions=glitch_actions,
        shots=[("idle", 1, ""), ("glitch", 8, "_glitch")],
    )


if __name__ == "__main__":
    build()
