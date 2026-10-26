"""Byte: the little black voxel companion (a dark take on the Claude Code mascot).
Box body, two glowing red eyes, stub arms, four legs. Clips: idle, walk, talk, hop.
Run: blender --background --python blender/byte.py
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import ns_common as ns  # noqa: E402
import voxel  # noqa: E402
import voxel_detective as vd  # noqa: E402

CELL = 0.06
LEGS = (-4, -2, 1, 3)  # x of each one-pixel leg, as in the original sprite


def _model():
    v = voxel.VoxelModel()
    v.box((-4, 4), (-2, 2), (2, 7), "body", "body")
    v.box((-6, -4), (-1, 1), (4, 5), "body", "arm.R")
    v.box((4, 6), (-1, 1), (4, 5), "body", "arm.L")
    for i, x in enumerate(LEGS):
        v.box((x, x + 1), (-1, 1), (0, 2), "body", "leg.%d" % i)
    v.paint([(-3, -2, 5), (2, -2, 5)], "eye")
    return v


def _materials():
    return {
        "body": ns.material("ByteBody", "#1c1c21", roughness=0.55),
        "body~": ns.material("ByteBodyShade", vd._shade("#1c1c21"), roughness=0.55),
        "eye": ns.material("ByteEye", "#2a0006", emission="#ff1a3c", strength=10),
    }


def _bones():
    c = CELL

    def p(x, y, z):
        return (x * c, y * c, z * c)

    result = [("root", p(0, 0, 0), p(0, 0, 1), None), ("body", p(0, 0, 2), p(0, 0, 7), "root"),
              ("arm.L", p(4, 0, 4.5), p(6, 0, 4.5), "body"), ("arm.R", p(-4, 0, 4.5), p(-6, 0, 4.5), "body")]
    return result + [("leg.%d" % i, p(x + 0.5, 0, 2), p(x + 0.5, 0, 0), "body") for i, x in enumerate(LEGS)]


def _actions(rig):
    c = CELL
    ns.animate(rig, "idle", {1: {}, 16: {"body": {"loc": (0, 0, 0.3 * c)},
                                         "arm.L": {"rot": (0, -0.15, 0)}, "arm.R": {"rot": (0, 0.15, 0)}}, 31: {}})

    def step(legs, lift):
        pose = {"body": {"loc": (0, 0, 0.25 * c)}}
        for i in legs:
            pose["leg.%d" % i] = {"loc": (0, 0, lift)}
        return pose

    ns.animate(rig, "walk", {1: {}, 5: step((0, 2), 0.7 * c), 9: {}, 13: step((1, 3), 0.7 * c), 17: {}})
    ns.animate(rig, "talk", {1: {}, 6: {"body": {"loc": (0, 0, 0.2 * c)}, "arm.L": {"rot": (0, -0.6, 0)}}, 11: {},
                             16: {"body": {"loc": (0, 0, 0.2 * c)}, "arm.R": {"rot": (0, 0.6, 0)}}, 21: {}})
    ns.animate(rig, "hop", {1: {}, 5: {"root": {"loc": (0, 0, -0.5 * c)}},
                            11: {"root": {"loc": (0, 0, 3 * c)}, "arm.L": {"rot": (0, -0.9, 0)}, "arm.R": {"rot": (0, 0.9, 0)}},
                            17: {}, 20: {"root": {"loc": (0, 0, -0.3 * c)}}, 24: {}})


def build():
    ns.reset_scene()
    mesh = voxel.build_mesh(_model(), "Byte", CELL, _materials())
    rig = ns.build_rig("Byte", _bones())
    ns.bind(mesh, rig)
    _actions(rig)
    ns.export_glb(rig, "idle", "byte.glb")
    ns.stage(0.2)
    ns.prepare_render()
    camera = bpy.context.scene.camera
    camera.location = (0.75, -1.45, 0.62)
    ns._look_at(camera, (0, 0, 0.2))
    for action, frame, suffix in (("idle", 1, ""), ("walk", 5, "_walk"), ("hop", 11, "_hop")):
        rig.animation_data.action = bpy.data.actions[action]
        bpy.context.scene.frame_set(frame)
        ns.render_still("byte" + suffix + ".png")


if __name__ == "__main__":
    build()
