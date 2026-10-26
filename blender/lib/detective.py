"""Forensic investigator builder: suit, shirt and tie, long open black coat, gloves,
sunglasses or glasses. One parametric builder makes the player, the partner and The Ghost.

Proportions follow the shared humanoid skeleton (height ~1.8 m, head centre at 1.655 m).
"""
from dataclasses import dataclass, field

import humanoid
import ns_common as ns


@dataclass
class Look:
    name: str
    skin: str = "#c68e6c"
    hair: str = "#17110d"
    hair_style: str = "short"  # short | bob | none
    # Dark noir palette (forensics / hacker mood): no light colors.
    suit: str = "#1f2128"
    shirt: str = "#2c2f36"
    tie: str = "#4a0c15"  # "" = no tie
    coat: str = "#0d0e11"
    eyewear: str = "sunglasses"  # sunglasses | glasses | none
    mask: bool = False
    hood: bool = False
    eyes: str = "slits"  # slits | laser (one line across the whole visor)
    laser: str = "#ff1a3c"
    coat_bottom: float = 0.3  # raise above the knee (~0.62) so both legs read clearly
    torso: tuple = (0.19, 0.225)  # bottom / top radius
    scale: float = 1.0
    extras: list = field(default_factory=list)  # callables (ch, materials) for unique details


def _materials(look):
    return {
        "skin": ns.material(look.name + "Skin", look.skin, roughness=0.55),
        "hair": ns.material(look.name + "Hair", look.hair, roughness=0.65),
        "suit": ns.material(look.name + "Suit", look.suit, roughness=0.6),
        "shirt": ns.material(look.name + "Shirt", look.shirt, roughness=0.5),
        "tie": ns.material(look.name + "Tie", look.tie or "#000000", roughness=0.4),
        "coat": ns.material(look.name + "Coat", look.coat, roughness=0.45),
        "coat_shell": ns.material(look.name + "CoatShell", look.coat, roughness=0.45, double_sided=True),
        "glove": ns.material(look.name + "Glove", "#0a0a0c", roughness=0.3, metallic=0.1),
        "shoe": ns.material(look.name + "Shoe", "#09090b", roughness=0.18, metallic=0.2),
        "lens": ns.material(look.name + "Lens", "#05060a", roughness=0.06, metallic=0.9),
        "clear_lens": ns.material(look.name + "SmokedLens", "#1c2a3d", roughness=0.05, metallic=0.4, alpha=0.6, double_sided=True),
        "frame": ns.material(look.name + "Frame", "#111216", roughness=0.25, metallic=0.7),
        "mask": ns.material(look.name + "Mask", "#1c1d22", roughness=0.12, metallic=0.35, double_sided=True),
        "red": ns.material(look.name + "Red", "#1a0004", emission="#ff1744", strength=7),
        "laser": ns.material(look.name + "Laser", "#2a0006", emission=look.laser, strength=14),
    }


def _head(ch, m, look):
    def jaw(co):
        dz = co.z - 1.655
        if dz < 0:
            t = min(1.0, -dz / 0.12)
            co.x *= 1 - 0.3 * t
            co.y = co.y - 0.012 * t if co.y < 0 else co.y * (1 - 0.18 * t)
        return co

    head = ns.sphere(0.105, (0, 0, 1.655), scale=(0.9, 1.0, 1.15), segments=24, rings=16)
    ch.add(ns.deform(head, jaw), "head", m["skin"], smooth=True, subdivide=1)
    if not look.mask:
        ch.add(ns.tube((0, -0.096, 1.668), (0, -0.124, 1.636), 0.015, 0.008, segments=8), "head", m["skin"], smooth=True)
        for sx in (1, -1):
            ch.add(ns.sphere(0.028, (sx * 0.093, 0.005, 1.655), scale=(0.35, 0.7, 1.0), segments=10, rings=6),
                   "head", m["skin"], smooth=True)
    ch.add(ns.tube((0, 0, 1.47), (0, 0, 1.585), 0.058, 0.05, segments=14), "neck", m["skin"], smooth=True)


def _hair(ch, m, look):
    if look.hair_style == "none" or look.hood:
        return
    if look.hair_style == "short":
        cap = ns.sphere(0.112, (0, 0.012, 1.672), scale=(0.95, 1.06, 1.12), segments=24, rings=14)
        # Hairline dips at the temples and covers the nape at the back.
        cap = ns.cut(cap, lambda co: (co.y < 0.03 and co.z < 1.66 + 0.25 * max(0.0, -co.y - 0.02)) or co.z < 1.6)
        ch.add(cap, "head", m["hair"], smooth=True, subdivide=1)
        return
    # Bob: a fuller shell that falls to the jaw line, open for the face, with a low bun.
    bob = ns.sphere(0.12, (0, 0.012, 1.648), scale=(1.0, 1.08, 1.25), segments=26, rings=16)
    ch.add(ns.cut(bob, lambda co: (co.y < -0.035 and co.z < 1.715) or co.z < 1.545), "head", m["hair"], smooth=True, subdivide=1)
    ch.add(ns.sphere(0.045, (0, 0.118, 1.6), segments=14, rings=10), "head", m["hair"], smooth=True)


def _eyewear(ch, m, look):
    if look.eyewear == "none" or look.mask:
        return
    lens = m["lens"] if look.eyewear == "sunglasses" else m["clear_lens"]
    for sx in (1, -1):
        x = sx * 0.036
        ch.add(ns.tube((x, -0.102, 1.672), (x, -0.11, 1.672), 0.027, 0.027, segments=18), "head", lens, smooth=True)
        ch.add(ns.torus(0.028, 0.003, (x, -0.108, 1.672), (1.5708, 0, 0), major_segments=20, minor_segments=4),
               "head", m["frame"])
        ch.add(ns.tube((sx * 0.063, -0.104, 1.676), (sx * 0.094, 0.0, 1.672), 0.003, 0.003, segments=5),
               "head", m["frame"])
    ch.add(ns.box((0.02, 0.006, 0.006), (0, -0.109, 1.678)), "head", m["frame"])


def _mask(ch, m, look):
    if not look.mask:
        return
    # Larger than the head so no skin pokes through; open at the back.
    face = ns.sphere(0.114, (0, -0.012, 1.652), scale=(0.95, 1.0, 1.2), segments=24, rings=16)
    ch.add(ns.cut(face, lambda co: co.y > -0.02), "head", m["mask"], smooth=True)
    if look.eyes == "laser":
        # Horizontal ring hugging the visor, cut to the front: reads as a laser sweeping side to side.
        ring = ns.torus(0.117, 0.0065, (0, -0.012, 1.674), major_segments=56, minor_segments=6)
        ring = ns.deform(ring, lambda co: (co.x * 0.96, co.y, co.z))
        ch.add(ns.cut(ring, lambda co: co.y > -0.045), "head", m["laser"], smooth=True)
        return
    for sx in (1, -1):
        ch.add(ns.box((0.045, 0.012, 0.011), (sx * 0.04, -0.124, 1.676), (0, sx * 0.18, 0)), "head", m["red"])


def _hood(ch, m, look):
    if look.hood:
        ch.add(humanoid.hood(1.0, 0.148, -0.07), "head", m["coat_shell"], smooth=True)


def _suit(ch, m, look):
    bottom, top = look.torso
    # Jacket runs down over the hips; the pelvis under it is rounded, not a box.
    ch.add(humanoid.torso(1.0, bottom, top, bottom_z=0.84), "spine", m["suit"], smooth=True, subdivide=1)
    ch.add(ns.tube((0, 0, 0.84), (0, 0, 1.0), 0.17, 0.18, segments=16, squash=(1, 0.66, 1)), "hips", m["suit"], smooth=True)
    # White shirt V, tie, and jacket lapels, on the chest.
    ch.add(ns.prism([(-0.055, 1.465), (0.055, 1.465), (0, 1.2)], -0.142, 0.02), "spine", m["shirt"])
    if look.tie:
        ch.add(ns.box((0.034, 0.02, 0.03), (0, -0.152, 1.445)), "spine", m["tie"], bevel=0.006)
        ch.add(ns.prism([(-0.017, 1.43), (0.017, 1.43), (0.026, 1.25), (0, 1.215), (-0.026, 1.25)], -0.153, 0.012),
               "spine", m["tie"])
    for sx in (1, -1):
        ch.add(ns.prism([(sx * 0.055, 1.465), (sx * 0.1, 1.45), (sx * 0.085, 1.36), (sx * 0.012, 1.2)], -0.146, 0.012),
               "spine", m["suit"])


def _coat(ch, m, look):
    bottom, top = look.torso
    upper = ns.tube((0, 0, 0.9), (0, 0, 1.485), bottom + 0.026, top + 0.022, segments=24, caps=False, squash=(1, 0.66, 1))
    ch.add(ns.cut(upper, lambda co: co.y < -0.08 and abs(co.x) < 0.07), "spine", m["coat_shell"], smooth=True)
    flare = 0.11 * (0.95 - look.coat_bottom) / 0.65
    skirt = ns.tube((0, 0, 0.95), (0, 0, look.coat_bottom), bottom + 0.04, bottom + 0.04 + flare, segments=24, caps=False, squash=(1, 0.72, 1))
    ch.add(ns.cut(skirt, lambda co: co.y < -0.11 and abs(co.x) < 0.045 + (0.95 - co.z) * 0.07), "hips", m["coat_shell"], smooth=True)
    collar = ns.tube((0, 0.0, 1.44), (0, 0.01, 1.57), 0.13, 0.155, segments=18, caps=False)
    ch.add(ns.cut(collar, lambda co: co.y < -0.06), "spine", m["coat_shell"], smooth=True)


def _limbs(ch, m, look):
    for side, sx in (("L", 1), ("R", -1)):
        ch.add(ns.sphere(0.08, (sx * 0.205, 0, 1.42), segments=16, rings=10), "upper_arm." + side, m["coat"], smooth=True)
        ch.add(ns.tube((sx * 0.2, 0, 1.43), (sx * 0.27, 0, 1.16), 0.072, 0.062), "upper_arm." + side, m["coat"], smooth=True)
        ch.add(ns.tube((sx * 0.27, 0, 1.16), (sx * 0.298, 0, 0.965), 0.062, 0.056), "forearm." + side, m["coat"], smooth=True)
        ch.add(ns.tube((sx * 0.297, 0, 0.975), (sx * 0.301, 0, 0.94), 0.048, 0.046), "forearm." + side, m["shirt"], smooth=True)
        palm = ns.box((0.05, 0.034, 0.085), (sx * 0.305, -0.004, 0.885))
        ch.add(palm, "hand." + side, m["glove"], smooth=True, bevel=0.012, subdivide=1)
        ch.add(ns.tube((sx * 0.29, -0.024, 0.905), (sx * 0.282, -0.04, 0.86), 0.011, 0.009, segments=8),
               "hand." + side, m["glove"], smooth=True)
        ch.add(ns.tube((sx * 0.1, 0, 0.97), (sx * 0.1, 0, 0.52), 0.08, 0.066), "thigh." + side, m["suit"], smooth=True)
        ch.add(ns.tube((sx * 0.1, 0, 0.52), (sx * 0.1, 0, 0.08), 0.064, 0.056), "shin." + side, m["suit"], smooth=True)
        ch.add(ns.box((0.098, 0.27, 0.07), (sx * 0.1, -0.045, 0.045)), "foot." + side, m["shoe"], smooth=True, bevel=0.025, subdivide=1)
        ch.add(ns.box((0.1, 0.07, 0.03), (sx * 0.1, 0.06, 0.015)), "foot." + side, m["shoe"], bevel=0.008)


def build(look, extra_bones=(), extra_actions=None, shots=None, target_z=0.95):
    """Builds, rigs, animates, exports <name>.glb and renders previews. Returns the rig."""
    ns.reset_scene()
    m = _materials(look)
    ch = ns.Character(look.name.capitalize())
    _head(ch, m, look)
    _hair(ch, m, look)
    _eyewear(ch, m, look)
    _mask(ch, m, look)
    _hood(ch, m, look)
    _suit(ch, m, look)
    _coat(ch, m, look)
    _limbs(ch, m, look)
    for extra in look.extras:
        extra(ch, m)
    mesh = ch.join()
    rig = ns.build_rig(look.name.capitalize(), humanoid.bones(1.0, extra=extra_bones))
    ns.bind(mesh, rig)
    rig.scale = (look.scale,) * 3  # the mesh is parented, so it scales with the rig
    humanoid.actions(rig, include_alert=extra_actions is None, extra=None)
    if extra_actions:
        extra_actions(rig)
    ns.export_glb(rig, "idle", look.name + ".glb")
    ns.render_previews(rig, shots or [("idle", 1, ""), ("point", 20, "_point")], target_z * look.scale, look.name)
    return rig
