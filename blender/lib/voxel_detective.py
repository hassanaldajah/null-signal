"""Voxel (pixel-art) forensic investigators: black suit + tie, long open black coat with a
raised collar, gloves, detective fedora, sunglasses. Player, partner and The Ghost share it.

Grid: 1 cell = 5.7 cm. Legs z 0-12, torso z 12-24, head z 25-33, fedora z 31-36.
"""
from dataclasses import dataclass, field

import humanoid
import ns_common as ns
import voxel

CELL = 0.057


@dataclass
class Look:
    name: str
    skin: str = "#b98163"
    mouth: str = "#7a4a38"
    hair: str = "#141010"
    hair_style: str = "short"  # short | bob | none
    suit: str = "#1b1c21"
    shirt: str = "#6f737b"
    tie: str = "#a3121f"  # "" = no tie
    coat: str = "#0e0f12"
    lapel: str = "#24252b"
    lens: str = "#020203"
    frame: str = "#2a2b31"
    eyewear: str = "sunglasses"  # sunglasses | glasses | none
    hat: str = "#111215"  # "" = no fedora
    hat_band: str = "#a3121f"
    ghost: bool = False  # hood + mask + glitch shards
    split_legs: bool = False  # two clear legs with a gap, coat cut above the knee
    scale: float = 1.0
    palette: dict = field(default_factory=dict)


def _shade(hex_, factor=0.72):
    """Darker twin of a color for the pixel checker."""
    value = hex_.lstrip("#")
    return "#" + "".join("%02x" % int(int(value[i:i + 2], 16) * factor) for i in (0, 2, 4))


def _materials(look):
    colors = {
        "skin": (look.skin, 0.6, 0.0), "mouth": (look.mouth, 0.6, 0.0), "hair": (look.hair, 0.7, 0.0),
        "suit": (look.suit, 0.65, 0.0), "shirt": (look.shirt, 0.55, 0.0), "tie": (look.tie or "#000000", 0.4, 0.0),
        "coat": (look.coat, 0.45, 0.1), "lapel": (look.lapel, 0.4, 0.1), "glove": ("#09090b", 0.3, 0.1),
        "shoe": ("#060607", 0.15, 0.3), "lens": (look.lens, 0.05, 0.9), "frame": (look.frame, 0.3, 0.6),
        "mask": ("#141519", 0.12, 0.4), "hat": (look.hat or "#000000", 0.6, 0.0),
        "band": (look.hat_band, 0.4, 0.0),
    }
    materials = {}
    for key, (hex_, r, m) in colors.items():
        materials[key] = ns.material(look.name + key.capitalize(), hex_, roughness=r, metallic=m)
        if key not in ("lens", "mouth"):
            materials[key + "~"] = ns.material(look.name + key.capitalize() + "Shade", _shade(hex_), roughness=r, metallic=m)
    materials["red"] = ns.material(look.name + "Red", "#1a0004", emission="#ff1744", strength=6)
    return materials


def _body(v, look):
    # Legs: trousers with shoes (toe sticks out one pixel). Split legs leave a 2-pixel gap
    # under a pelvis block so each leg reads on its own.
    width, top = (3, 10) if look.split_legs else (4, 12)
    for side, x0 in (("L", 4 - width), ("R", -4)):
        v.box((x0, x0 + width), (-2, 2), (6, top), "suit", "thigh." + side)
        v.box((x0, x0 + width), (-2, 2), (2, 6), "suit", "shin." + side)
        v.box((x0, x0 + width), (-2, 2), (0, 2), "shoe", "shin." + side)
        v.box((x0, x0 + width), (-3, -2), (0, 1), "shoe", "shin." + side)
    if look.split_legs:
        v.box((-4, 4), (-2, 2), (10, 12), "suit", "hips")
    # Suit torso with shirt V and tie on the front row (y = -2).
    v.box((-4, 4), (-2, 2), (12, 24), "suit", "spine")
    v.paint([(x, -2, 23) for x in range(-3, 3)] + [(x, -2, z) for z in (21, 22) for x in range(-2, 2)], "shirt")
    if look.tie:
        v.paint([(x, -2, z) for z in range(15, 24) for x in (-1, 0)], "tie")
    # Long coat: hollow shell, open at the front, lapels, raised collar.
    v.box((-5, 5), (-3, 3), (12, 24), "coat", "spine", hollow=True)
    v.carve(lambda x, y, z: y == -3 and -3 <= x <= 2 and 12 <= z < 24)
    for x in (-3, 2):
        v.box((x, x + 1), (-3, -2), (19, 24), "lapel", "spine")
    v.box((-5, 5), (-3, 3), (24, 26), "coat", "spine", hollow=True)
    v.carve(lambda x, y, z: 24 <= z < 26 and y == -3 and -3 <= x <= 2)
    v.box((-5, 5), (-3, 3), (9 if look.split_legs else 4, 12), "coat", "hips", hollow=True)
    v.carve(lambda x, y, z: z < 12 and y == -3 and abs(x + 0.5) < 1.5 + (12 - z) * 0.35)
    v.box((-1, 1), (-1, 1), (24, 25), "skin", "neck")
    # Arms: coat sleeves, shirt cuff pixel row, gloves.
    for side, x0 in (("L", 5), ("R", -9)):
        v.box((x0, x0 + 4), (-2, 2), (18, 24), "coat", "upper_arm." + side)
        v.box((x0, x0 + 4), (-2, 2), (15, 18), "coat", "forearm." + side)
        v.box((x0, x0 + 4), (-2, 2), (14, 15), "shirt", "forearm." + side)
        v.box((x0, x0 + 4), (-2, 2), (11, 14), "glove", "forearm." + side)


def _head(v, look):
    v.box((-4, 4), (-4, 4), (25, 33), "skin", "head")
    for x in (-5, 4):
        v.box((x, x + 1), (0, 1), (27, 29), "skin", "head")  # ears
    v.box((-1, 1), (-5, -4), (27, 28), "skin", "head")  # nose
    v.paint([(-1, -4, 26), (0, -4, 26)], "mouth")
    if look.hair_style != "none":
        v.paint([(x, y, z) for x in range(-4, 4) for y in range(-4, 4) for z in (31, 32)], "hair")
        v.paint([(x, 3, z) for x in range(-4, 4) for z in range(26, 33)], "hair")
        v.paint([(x, y, z) for x in (-4, 3) for y in range(-2, 4) for z in range(29, 33)], "hair")
        if look.hair_style == "bob":
            v.paint([(x, y, z) for x in (-4, 3) for y in range(-3, 4) for z in range(25, 33)], "hair")
            v.box((-5, -4), (-3, 4), (25, 32), "hair", "head")
            v.box((4, 5), (-3, 4), (25, 32), "hair", "head")
            v.box((-2, 2), (4, 6), (26, 29), "hair", "head")  # bun
            v.paint([(x, -4, 31) for x in range(-4, 4)], "hair")  # fringe
    if look.hat:
        _fedora(v)
    if look.eyewear == "sunglasses":
        # Solid black shades: two 3x2 lenses joined by a bridge, temples to the ears.
        for x0 in (-4, 0):
            v.box((x0, x0 + 3), (-5, -4), (28, 30), "lens", "head")
        v.box((-1, 0), (-5, -4), (29, 30), "lens", "head")
        for x in (-5, 4):
            v.box((x, x + 1), (-4, 0), (29, 30), "lens", "head")
    elif look.eyewear != "none":
        lens = [(x, -4, z) for z in (28, 29) for x in (-3, -2, 0, 1)]
        v.box((-4, 4), (-5, -4), (29, 30), "frame", "head")  # top bar
        for x0 in (-3, 0):
            v.box((x0, x0 + 2), (-5, -4), (28, 29), "frame", "head")
        v.paint(lens, "lens")
        for x in (-5, 4):
            v.box((x, x + 1), (-4, 0), (29, 30), "frame", "head")  # temples


def _fedora(v):
    """Detective fedora: wide brim, pinched crown, red band."""
    v.box((-6, 6), (-6, 6), (31, 32), "hat", "head")  # brim
    v.carve(lambda x, y, z: z == 31 and abs(x + 0.5) == 5.5 and abs(y + 0.5) == 5.5)  # round corners
    v.box((-4, 4), (-4, 4), (32, 33), "band", "head")
    v.box((-4, 4), (-4, 4), (33, 35), "hat", "head")
    v.box((-3, 3), (-3, 3), (35, 36), "hat", "head")
    v.carve(lambda x, y, z: z == 35 and x in (-1, 0))  # crown crease


def _ghost(v):
    v.box((-5, 5), (-5, 5), (25, 34), "coat", "head", hollow=True)  # hood
    v.box((-5, 5), (-5, 5), (33, 34), "coat", "head")
    v.carve(lambda x, y, z: y == -5 and -3 <= x <= 2 and 25 <= z < 32)
    v.paint([(x, -4, z) for x in range(-4, 4) for z in range(25, 33)], "mask")
    v.paint([(x, -4, 29) for x in (-3, -2, 1, 2)], "red")
    for cell in ((7, 1, 30), (-8, -1, 28), (6, 3, 33), (-6, 4, 24), (8, -2, 22), (-9, 1, 26)):
        v.cells[cell] = ("red", "glitch")


def bones(extra=()):
    c = CELL

    def p(x, y, z):
        return (x * c, y * c, z * c)

    result = [
        ("root", p(0, 0, 0), p(0, 0, 3), None),
        ("hips", p(0, 0, 12), p(0, 0, 14), "root"),
        ("spine", p(0, 0, 14), p(0, 0, 24), "hips"),
        ("neck", p(0, 0, 24), p(0, 0, 25), "spine"),
        ("head", p(0, 0, 25), p(0, 0, 33), "neck"),
    ]
    for side, x in (("L", 7), ("R", -7)):
        result += [
            ("upper_arm." + side, p(x, 0, 24), p(x, 0, 18), "spine"),
            ("forearm." + side, p(x, 0, 18), p(x, 0, 11), "upper_arm." + side),
            ("thigh." + side, p(x / 3.5, 0, 12), p(x / 3.5, 0, 6), "hips"),
            ("shin." + side, p(x / 3.5, 0, 6), p(x / 3.5, 0, 0), "thigh." + side),
        ]
    return result + [(n, p(*h), p(*t), parent) for n, h, t, parent in extra]


def build(look, extra_actions=None, shots=None):
    ns.reset_scene()
    v = voxel.VoxelModel()
    _body(v, look)
    _head(v, look)
    extra_bones = ()
    if look.ghost:
        _ghost(v)
        extra_bones = [("glitch", (0, 0, 26), (0, 0, 30), "spine")]
    mesh = voxel.build_mesh(v, look.name.capitalize(), CELL, _materials(look))
    rig = ns.build_rig(look.name.capitalize(), bones(extra_bones))
    ns.bind(mesh, rig)
    rig.scale = (look.scale,) * 3
    humanoid.actions(rig, include_alert=extra_actions is None)
    if extra_actions:
        extra_actions(rig)
    ns.export_glb(rig, "idle", look.name + ".glb")
    ns.render_previews(rig, shots or [("idle", 1, ""), ("point", 20, "_point")], 1.0 * look.scale, look.name)
    return rig
