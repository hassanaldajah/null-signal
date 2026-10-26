"""Turns Mixamo downloads into one web-ready .glb per character.

Input  (not committed): blender/source/<name>/character.fbx + idle/talk/point/alert.fbx
Output: public/models/<name>.glb  (one skeleton, clips: idle, talk, point, alert [+ glitch])
        blender/previews/<name>.png, <name>_point.png

Run: blender --background --python blender/import_mixamo.py -- investigator ghost

What it does: imports the rigged character, merges every animation onto its skeleton as
NLA tracks, scales textures down to 1024 px (WebP in the .glb), adds per-character extras
(The Ghost gets a mask + a scripted "glitch" clip), Draco-compresses and exports.
"""
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import ns_common as ns  # noqa: E402

SOURCE_DIR = os.path.join(ns.ROOT, "blender", "source")
CLIPS = ("idle", "talk", "point", "alert")
MAX_TEXTURE = 1024


def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False, ignore_leaf_bones=True)
    return [obj for obj in bpy.data.objects if obj not in before]


def find_bone(armature, suffix):
    for bone in armature.data.bones:
        if bone.name.split(":")[-1] == suffix:
            return bone.name
    raise KeyError("bone *%s not found" % suffix)


def add_clip(armature, name, action):
    action.name = name
    action.use_fake_user = True
    if armature.animation_data is None:
        armature.animation_data_create()
    track = armature.animation_data.nla_tracks.new()
    track.name = name
    start = int(action.frame_range[0])
    strip = track.strips.new(name, start, action)
    if hasattr(strip, "action_slot") and getattr(action, "slots", None):
        strip.action_slot = action.slots[0]
    track.mute = False


def import_clips(armature, folder):
    for clip in CLIPS:
        path = os.path.join(folder, clip + ".fbx")
        if not os.path.exists(path):
            print("WARNING: missing clip", path)
            continue
        new_objects = import_fbx(path)
        donor = next(obj for obj in new_objects if obj.type == "ARMATURE")
        action = donor.animation_data.action
        donor.animation_data.action = None
        add_clip(armature, clip, action)
        for obj in new_objects:
            bpy.data.objects.remove(obj, do_unlink=True)


def shrink_textures():
    for image in bpy.data.images:
        if image.size[0] == 0:
            continue
        largest = max(image.size)
        if largest > MAX_TEXTURE:
            factor = MAX_TEXTURE / largest
            image.scale(int(image.size[0] * factor), int(image.size[1] * factor))
            image.pack()


def head_frame(armature):
    """World-space head bone position and size of the head (rest pose)."""
    bone = armature.data.bones[find_bone(armature, "Head")]
    head = armature.matrix_world @ bone.head_local
    tail = armature.matrix_world @ bone.tail_local
    return head, (tail - head).length


def add_ghost_mask(armature):
    """Ceramic mask with red eye slits, parented to the head bone."""
    head, length = head_frame(armature)
    size = max(length, 0.08)
    mask_mat = ns.material("GhostMask", "#e9e6df", roughness=0.25, double_sided=True)
    slit_mat = ns.material("GhostSlits", "#1a0004", emission="#ff1744", strength=6)
    ch = ns.Character("GhostMask")
    face = ns.sphere(size * 0.95, (0, 0, 0), scale=(0.95, 0.7, 1.2))
    ch.add(ns.cut(face, lambda co: co.y > -size * 0.15), "mask", mask_mat, smooth=True)
    for sx in (1, -1):
        ch.add(ns.box((size * 0.38, size * 0.08, size * 0.09), (sx * size * 0.34, -size * 0.67, size * 0.22),
                      (0, sx * 0.18, 0)), "mask", slit_mat)
    mask = ch.join()
    mask.vertex_groups.clear()
    # Mixamo characters face -Y in Blender; place the mask in front of the face.
    mask.location = head + Vector((0, -size * 0.35, size * 0.55))
    world = mask.matrix_world.copy()
    mask.parent = armature
    mask.parent_type = "BONE"
    mask.parent_bone = find_bone(armature, "Head")
    mask.matrix_world = world


def add_glitch_clip(armature):
    """Digital-glitch twitch: jitter on hips/spine/head bones, 24 frames."""
    names = {key: find_bone(armature, key) for key in ("Hips", "Spine", "Head")}
    action = bpy.data.actions.new("glitch")
    armature.animation_data.action = action
    random.seed(13)
    for frame in range(1, 26):
        calm = frame in (1, 25) or frame % 5 == 0
        for key, bone_name in names.items():
            pose_bone = armature.pose.bones[bone_name]
            pose_bone.rotation_mode = "XYZ"
            jitter = 0 if calm else (0.25 if key == "Head" else 0.08)
            pose_bone.rotation_euler = tuple(random.uniform(-jitter, jitter) for _ in range(3))
            pose_bone.location = (0, 0, 0) if calm or key != "Hips" else (random.uniform(-3, 3), 0, random.uniform(-2, 2))
            pose_bone.keyframe_insert("rotation_euler", frame=frame)
            pose_bone.keyframe_insert("location", frame=frame)
    armature.animation_data.action = None
    add_clip(armature, "glitch", action)


def build(name):
    folder = os.path.join(SOURCE_DIR, name)
    character_path = os.path.join(folder, "character.fbx")
    if not os.path.exists(character_path):
        print("SKIP %s: put Mixamo files in %s" % (name, folder))
        return
    ns.reset_scene()
    imported = import_fbx(character_path)
    armature = next(obj for obj in imported if obj.type == "ARMATURE")
    armature.name = name.capitalize() + "Rig"
    if armature.animation_data and armature.animation_data.action:
        armature.animation_data.action = None  # drop the T-pose take
    import_clips(armature, folder)
    if name == "ghost":
        add_ghost_mask(armature)
        add_glitch_clip(armature)
    shrink_textures()

    os.makedirs(ns.MODELS_DIR, exist_ok=True)
    path = os.path.join(ns.MODELS_DIR, name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_animation_mode="NLA_TRACKS",
        export_image_format="WEBP",
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    print("EXPORTED %s (%.0f KB)" % (path, os.path.getsize(path) / 1024))

    # Preview: solo one NLA track per shot.
    height = max((armature.matrix_world @ b.head_local).z for b in armature.data.bones)
    ns.stage(height * 0.55)
    ns.prepare_render()
    for clip, frame, suffix in (("idle", 1, ""), ("point", 40, "_point")):
        for track in armature.animation_data.nla_tracks:
            track.mute = track.name != clip
        bpy.context.scene.frame_set(frame)
        ns.render_still(name + suffix + ".png")


def main():
    names = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["investigator", "ghost"]
    for name in names:
        build(name)
    print("MIXAMO_DONE")


main()
