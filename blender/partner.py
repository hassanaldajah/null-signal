"""Partner: senior investigator in the same design language as the player (black round
visor, laser eyes, black suit and long coat) with her own silhouette: dark bob with a high
ponytail instead of a hood, cyan laser, slimmer build, high collar, no tie, coat above the knee.
Run: blender --background --python blender/partner.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import detective  # noqa: E402
import ns_common as ns  # noqa: E402


def high_collar(ch, m):
    ch.add(ns.tube((0, 0, 1.45), (0, 0, 1.56), 0.072, 0.064, segments=16), "neck", m["suit"], smooth=True)


def ponytail(ch, m):
    """High ponytail: a tie band at the crown, then a tail falling to the shoulder blades."""
    ch.add(ns.sphere(0.04, (0, 0.105, 1.75), segments=12, rings=8), "head", m["hair"], smooth=True)
    ch.add(ns.tube((0, 0.13, 1.75), (0, 0.19, 1.6), 0.036, 0.028, segments=12), "head", m["hair"], smooth=True)
    ch.add(ns.tube((0, 0.19, 1.6), (0, 0.17, 1.4), 0.028, 0.008, segments=12), "head", m["hair"], smooth=True)


def build():
    detective.build(
        detective.Look(
            name="partner",
            skin="#1a1a1f",
            hair="#3d2232",
            hair_style="bob",
            suit="#0d0d10",
            shirt="#16161a",
            tie="",
            coat="#09090b",
            eyewear="none",
            mask=True,
            eyes="laser",
            laser="#00e5ff",
            torso=(0.17, 0.2),
            coat_bottom=0.62,
            scale=0.95,
            extras=[high_collar, ponytail],
        ),
        target_z=0.98,
    )


if __name__ == "__main__":
    build()
