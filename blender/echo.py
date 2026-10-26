"""ECHO: abstract floating holographic AI. Crystal torso, glowing core, orbiting rings,
shard arms, data particles and a projector base.
Run: blender --background --python blender/echo.py
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import ns_common as ns  # noqa: E402
from mathutils import Euler, Vector  # noqa: E402

CORE_Z = 1.12
RING_B_TILT = (math.pi / 3, math.pi / 5, 0)
RING_AXES = {
    "ring_a": (0, 1, 0),
    "ring_b": tuple(Euler(RING_B_TILT, "XYZ").to_matrix() @ Vector((0, 0, 1))),
    "ring_c": (0, 0, 1),
}

BONES = [
    ("root", (0, 0, 0), (0, 0, 0.2), None),
    ("body", (0, 0, 0.8), (0, 0, 1.3), "root"),
    ("head", (0, 0, 1.33), (0, 0, 1.53), "body"),
    ("ring_a", (0, 0, CORE_Z), (0, 0, CORE_Z + 0.1), "body"),
    ("ring_b", (0, 0, CORE_Z), (0, 0, CORE_Z + 0.1), "body"),
    ("ring_c", (0, 0, CORE_Z), (0, 0, CORE_Z + 0.1), "body"),
    ("orbit", (0, 0, CORE_Z), (0, 0, CORE_Z + 0.18), "body"),
    ("arm.L", (0.17, 0, 1.25), (0.25, 0, 0.98), "body"),
    ("arm.R", (-0.17, 0, 1.25), (-0.25, 0, 0.98), "body"),
]


def spin_rings(t, speed=1.0):
    turn = 2 * math.pi * t * speed
    return {
        "ring_a": {"spin": (RING_AXES["ring_a"], turn)},
        "ring_b": {"spin": (RING_AXES["ring_b"], -turn)},
        "ring_c": {"spin": (RING_AXES["ring_c"], turn)},
        "orbit": {"spin": ((0, 0, 1), -turn)},
    }


def keys_every(step, length, pose_at):
    """Keys every `step` frames from 1 to 1+length; pose_at(t) gives the pose at t in 0..1."""
    return {1 + i * step: pose_at(i * step / length) for i in range(length // step + 1)}


def build():
    ns.reset_scene()
    holo = ns.material("Holo", "#00e5ff", roughness=0.2, emission="#00e5ff", strength=2.0,
                       alpha=0.42, double_sided=True)
    core = ns.material("Core", "#bff9ff", emission="#bff9ff", strength=10)
    ring = ns.material("Ring", "#00e5ff", emission="#00e5ff", strength=6)
    beam = ns.material("Beam", "#00e5ff", emission="#00e5ff", strength=1.2, alpha=0.12, double_sided=True)
    spark = ns.material("Spark", "#ff2bd6", emission="#ff2bd6", strength=6)

    ch = ns.Character("Echo")
    ch.add(ns.tube((0, 0, 0.82), (0, 0, 1.28), 0.03, 0.19, segments=6), "body", holo)
    ch.add(ns.ico(0.1, (0, 0, 1.43), subdivisions=1), "head", holo)
    ch.add(ns.torus(0.102, 0.006, (0, 0, 1.44), major_segments=24, minor_segments=4), "head", ring)
    ch.add(ns.ico(0.065, (0, 0, CORE_Z), subdivisions=2), "body", core, smooth=True)
    ch.add(ns.torus(0.3, 0.008, (0, 0, CORE_Z), (math.pi / 2, 0, 0)), "ring_a", ring)
    ch.add(ns.torus(0.36, 0.006, (0, 0, CORE_Z), RING_B_TILT), "ring_b", ring)
    ch.add(ns.torus(0.42, 0.005, (0, 0, CORE_Z)), "ring_c", ring)
    for side, sx in (("L", 1), ("R", -1)):
        ch.add(ns.tube((0.17 * sx, 0, 1.25), (0.25 * sx, 0, 0.98), 0.03, 0.006, segments=5), "arm." + side, holo)
    random.seed(5)
    for i in range(10):
        angle = 2 * math.pi * i / 10 + random.uniform(-0.2, 0.2)
        radius = random.uniform(0.36, 0.55)
        center = (radius * math.cos(angle), radius * math.sin(angle), random.uniform(0.9, 1.5))
        ch.add(ns.ico(0.012, center, subdivisions=0), "orbit", spark if i % 2 else ring)
    ch.add(ns.torus(0.22, 0.01, (0, 0, 0.02), major_segments=40, minor_segments=4), "root", ring)
    ch.add(ns.tube((0, 0, 0.03), (0, 0, 0.8), 0.2, 0.02, segments=24, caps=False), "root", beam, smooth=True)

    mesh = ch.join()
    rig = ns.build_rig("Echo", BONES)
    ns.bind(mesh, rig)

    def wave(t, cycles=1.0):
        return math.sin(2 * math.pi * t * cycles)

    def idle(t):
        pose = spin_rings(t)
        pose["body"] = {"loc": (0, 0, 0.035 * wave(t))}
        pose["head"] = {"rot": (0, 0, 0.1 * wave(t))}
        pose["arm.L"] = {"rot": (0, -0.06 * wave(t), 0)}
        pose["arm.R"] = {"rot": (0, 0.06 * wave(t), 0)}
        return pose

    def talk(t):
        pose = spin_rings(t, 0.5)
        pose["body"] = {"loc": (0, 0, 0.015 * wave(t, 2))}
        pose["head"] = {"scale": 1.0 + 0.08 * abs(wave(t, 4)), "rot": (0.06 * wave(t, 2), 0, 0)}
        pose["arm.R"] = {"rot": (-0.35 * max(0.0, wave(t, 2)), 0, 0)}
        pose["arm.L"] = {"rot": (-0.25 * max(0.0, -wave(t, 2)), 0, 0)}
        return pose

    def point(t):
        pose = spin_rings(t)
        raise_amount = min(1.0, t / 0.2) if t < 0.8 else max(0.0, (1.0 - t) / 0.2)
        pose["arm.R"] = {"rot": (-1.3 * raise_amount, 0, 0.3 * raise_amount)}
        pose["body"] = {"rot": (0, 0, -0.2 * raise_amount)}
        return pose

    def alert(t):
        pose = spin_rings(t, 2.0)
        shake = 0.0 if t in (0.0, 1.0) else 0.03 * wave(t, 6)
        pose["body"] = {"loc": (shake, 0, 0.05 * math.sin(math.pi * t))}
        pose["head"] = {"scale": 1.0 + 0.15 * math.sin(math.pi * t)}
        return pose

    ns.animate(rig, "idle", keys_every(15, 90, idle))
    ns.animate(rig, "talk", keys_every(5, 40, talk))
    ns.animate(rig, "point", keys_every(5, 45, point))
    ns.animate(rig, "alert", keys_every(3, 30, alert))

    ns.export_glb(rig, "idle", "echo.glb")
    ns.render_previews(rig, [("idle", 1, ""), ("point", 20, "_point")], 1.05, "echo")


if __name__ == "__main__":
    build()
