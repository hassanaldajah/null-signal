"""Humanoid skeleton, base body and shared actions for the Investigator and The Ghost."""
import ns_common as ns


def bones(s=1.0, extra=()):
    def p(x, y, z):
        return (x * s, y * s, z * s)

    result = [
        ("root", p(0, 0, 0), p(0, 0, 0.2), None),
        ("hips", p(0, 0, 0.95), p(0, 0, 1.05), "root"),
        ("spine", p(0, 0, 1.05), p(0, 0, 1.45), "hips"),
        ("neck", p(0, 0, 1.45), p(0, 0, 1.53), "spine"),
        ("head", p(0, 0, 1.53), p(0, 0, 1.8), "neck"),
    ]
    for side, sx in (("L", 1), ("R", -1)):
        result += [
            ("upper_arm." + side, p(0.2 * sx, 0, 1.42), p(0.27 * sx, 0, 1.16), "spine"),
            ("forearm." + side, p(0.27 * sx, 0, 1.16), p(0.3 * sx, 0, 0.95), "upper_arm." + side),
            ("hand." + side, p(0.3 * sx, 0, 0.95), p(0.31 * sx, 0, 0.84), "forearm." + side),
            ("thigh." + side, p(0.1 * sx, 0, 0.95), p(0.1 * sx, 0, 0.52), "hips"),
            ("shin." + side, p(0.1 * sx, 0, 0.52), p(0.1 * sx, 0, 0.1), "thigh." + side),
            ("foot." + side, p(0.1 * sx, 0, 0.1), p(0.1 * sx, -0.12 * s, 0.03 * s), "shin." + side),
        ]
    return result + [(n, p(*h), p(*t), parent) for n, h, t, parent in extra]


def add_body(ch, s, skin, sleeve, pants, shoe, sole, hand=None, head=True):
    """Neck, head, arms, hands, pelvis, legs and shoes. Outfits add torso/hood/etc."""
    def p(x, y, z):
        return (x * s, y * s, z * s)

    hand = hand or skin
    ch.add(ns.tube(p(0, 0, 1.44), p(0, 0, 1.56), 0.048 * s, 0.045 * s), "neck", skin, smooth=True)
    if head:
        ch.add(ns.sphere(0.115 * s, p(0, 0, 1.65), scale=(1, 1.02, 1.12)), "head", skin, smooth=True)
    ch.add(ns.box(p(0.36, 0.22, 0.16), p(0, 0, 0.97)), "hips", pants, bevel=0.03 * s)
    for side, sx in (("L", 1), ("R", -1)):
        ch.add(ns.sphere(0.074 * s, p(0.205 * sx, 0, 1.42), segments=14, rings=8),
               "upper_arm." + side, sleeve, smooth=True)
        ch.add(ns.tube(p(0.2 * sx, 0, 1.43), p(0.27 * sx, 0, 1.16), 0.066 * s, 0.056 * s),
               "upper_arm." + side, sleeve, smooth=True)
        ch.add(ns.tube(p(0.27 * sx, 0, 1.16), p(0.3 * sx, 0, 0.96), 0.056 * s, 0.05 * s),
               "forearm." + side, sleeve, smooth=True)
        ch.add(ns.sphere(0.045 * s, p(0.305 * sx, 0, 0.9), scale=(0.75, 1, 1.25), segments=12, rings=8),
               "hand." + side, hand, smooth=True)
        ch.add(ns.tube(p(0.1 * sx, 0, 0.97), p(0.1 * sx, 0, 0.52), 0.078 * s, 0.066 * s),
               "thigh." + side, pants, smooth=True)
        ch.add(ns.tube(p(0.1 * sx, 0, 0.52), p(0.1 * sx, 0, 0.1), 0.064 * s, 0.054 * s),
               "shin." + side, pants, smooth=True)
        ch.add(ns.box(p(0.115, 0.27, 0.085), p(0.1 * sx, -0.04, 0.06)), "foot." + side, shoe, bevel=0.02 * s)
        ch.add(ns.box(p(0.12, 0.275, 0.025), p(0.1 * sx, -0.04, 0.0125)), "foot." + side, sole)


def torso(s, bottom_radius, top_radius, bottom_z=0.92):
    """Rounded, tapered torso (wider chest than waist), front-to-back flattened."""
    return ns.tube((0, 0, bottom_z * s), (0, 0, 1.47 * s), bottom_radius * s, top_radius * s,
                   segments=16, squash=(1, 0.62, 1))


def hood(s, radius, front_cut):
    """Hood shell that wraps the sides of the head, open at the face and the neck."""
    shell = ns.sphere(radius * s, (0, 0.005 * s, 1.66 * s), scale=(1, 1.06, 1.1))
    return ns.cut(shell, lambda co: (co.y < front_cut * s and co.z > 1.52 * s) or co.z < 1.47 * s)


def _merge(base, extra):
    for bone, values in extra.items():
        base.setdefault(bone, {}).update(values)
    return base


def actions(rig, include_alert=True, extra=None):
    """idle, talk, point (+ alert). `extra(action, t)` returns more bone values to merge,
    where t is the normalized time 0..1 of the key (used for looping props)."""
    def key_set(name, frames):
        last = max(frames)
        keys = {}
        for frame, pose in frames.items():
            pose = {bone: dict(values) for bone, values in pose.items()}
            if extra:
                _merge(pose, extra(name, (frame - 1) / (last - 1)))
            keys[frame] = pose
        ns.animate(rig, name, keys)

    breathe_out = {"spine": {"rot": (0.025, 0, 0.01)}, "head": {"rot": (0, 0, 0.04)},
                   "upper_arm.L": {"rot": (0, -0.04, 0)}, "upper_arm.R": {"rot": (0, 0.04, 0)}}
    key_set("idle", {
        1: {}, 16: breathe_out, 31: {"head": {"rot": (-0.02, 0, 0)}},
        46: {"spine": {"rot": (0.025, 0, -0.01)}, "head": {"rot": (0, 0, -0.04)},
             "upper_arm.L": {"rot": (0, -0.04, 0)}, "upper_arm.R": {"rot": (0, 0.04, 0)}},
        61: {},
    })
    gesture_r = {"upper_arm.R": {"rot": (-0.35, 0.12, 0)}, "forearm.R": {"rot": (-0.75, 0, 0)}}
    key_set("talk", {
        1: {},
        9: _merge({"head": {"rot": (0.08, 0, 0.03)}, "spine": {"rot": (0, 0, 0.04)}}, gesture_r),
        17: {"head": {"rot": (-0.03, 0, -0.02)}, "upper_arm.R": {"rot": (-0.25, 0.18, 0)},
             "forearm.R": {"rot": (-0.95, 0, 0.2)}},
        25: {"head": {"rot": (0.06, 0, 0)}, "upper_arm.L": {"rot": (-0.3, -0.12, 0)},
             "forearm.L": {"rot": (-0.65, 0, 0)}, "upper_arm.R": {"rot": (-0.15, 0.08, 0)},
             "forearm.R": {"rot": (-0.4, 0, 0)}},
        33: _merge({"head": {"rot": (0, 0, 0.04)}}, gesture_r),
        41: {"head": {"rot": (0.04, 0, 0)}},
        49: {},
    })
    pointing = {"upper_arm.R": {"rot": (-1.42, 0, 0)}, "forearm.R": {"rot": (-0.08, 0, 0)},
                "spine": {"rot": (0, 0, -0.12)}, "head": {"rot": (0, 0, -0.08)}}
    key_set("point", {1: {}, 10: pointing, 36: pointing, 46: {}})
    if include_alert:
        guard = {"spine": {"rot": (-0.08, 0, 0)},
                 "upper_arm.L": {"rot": (-0.7, -0.25, 0)}, "forearm.L": {"rot": (-1.1, 0, 0)},
                 "upper_arm.R": {"rot": (-0.7, 0.25, 0)}, "forearm.R": {"rot": (-1.1, 0, 0)}}
        key_set("alert", {
            1: {},
            5: _merge({"head": {"rot": (0.05, 0, 0.45)}}, guard),
            12: _merge({"head": {"rot": (0.05, 0, -0.45)}}, guard),
            20: _merge({"head": {"rot": (0, 0, 0)}}, guard),
            30: {},
        })
