"""Player: the masked investigator. Tall tailored silhouette, black suit and coat, hood,
black round visor with one red laser line across it for eyes.
Run: blender --background --python blender/investigator.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import detective  # noqa: E402


def build():
    detective.build(
        detective.Look(
            name="investigator",
            skin="#1a1a1f",
            suit="#0b0b0e",
            shirt="#141418",
            tie="#2a0006",
            coat="#08080a",
            eyewear="none",
            mask=True,
            hood=True,
            eyes="laser",
            scale=1.04,
        ),
        target_z=1.0,
    )


if __name__ == "__main__":
    build()
