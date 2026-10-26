"""Shared toolkit for NULL SIGNAL character scripts (Blender 5.2, run headless).

Characters are built from primitives, joined into one mesh, rigidly skinned to a
simple custom rig (one vertex group per bone), animated with baked actions and
exported as Draco-compressed .glb files.

Axes: X = character's left, -Y = front, Z = up. 1 unit = 1 meter.
"""
import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(ROOT, "public", "models")
PREVIEW_DIR = os.path.join(ROOT, "blender", "previews")
FPS = 30


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    return scene


# --- Materials ---------------------------------------------------------------

def hex_to_linear(hex_color):
    def channel(value):
        value /= 255.0
        return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
    hex_color = hex_color.lstrip("#")
    return tuple(channel(int(hex_color[i:i + 2], 16)) for i in (0, 2, 4))


def material(name, color, roughness=0.6, metallic=0.0, emission=None, strength=0.0,
             alpha=1.0, double_sided=False):
    """PBR material. `emission` is a hex color; glTF exports it as emissive + strength."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    rgb = hex_to_linear(color)
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*hex_to_linear(emission), 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        for attribute, value in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(mat, attribute, value)
            except (AttributeError, TypeError):
                pass
    mat.use_backface_culling = not double_sided
    mat.diffuse_color = (*rgb, alpha)
    return mat


# --- Primitives (each returns a new BMesh in world space) ---------------------

def _place(bm, center=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1)):
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    matrix = Matrix.Translation(Vector(center)) @ Euler(rotation, "XYZ").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    return bm


def box(size, center=(0, 0, 0), rotation=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    return _place(bm, center, rotation, size)


def sphere(radius, center=(0, 0, 0), scale=(1, 1, 1), segments=20, rings=12):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    return _place(bm, center, (0, 0, 0), scale)


def ico(radius, center=(0, 0, 0), subdivisions=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    return _place(bm, center)


def tube(p0, p1, r0, r1, segments=12, caps=True, squash=(1, 1, 1)):
    """Tapered cylinder from p0 (radius r0) to p1 (radius r1)."""
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=segments,
                          radius1=r0, radius2=r1, depth=axis.length)
    bmesh.ops.scale(bm, vec=Vector(squash), verts=bm.verts)
    rotation = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((p0 + p1) / 2) @ rotation, verts=bm.verts)
    return bm


def torus(major, minor, center=(0, 0, 0), rotation=(0, 0, 0), major_segments=32, minor_segments=6):
    bm = bmesh.new()
    rings = []
    for i in range(major_segments):
        a = 2 * math.pi * i / major_segments
        ring = []
        for j in range(minor_segments):
            b = 2 * math.pi * j / minor_segments
            r = major + minor * math.cos(b)
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), minor * math.sin(b))))
        rings.append(ring)
    for i in range(major_segments):
        nxt = rings[(i + 1) % major_segments]
        for j in range(minor_segments):
            k = (j + 1) % minor_segments
            bm.faces.new((rings[i][j], nxt[j], nxt[k], rings[i][k]))
    return _place(bm, center, rotation)


def prism(points_xz, y_front, depth):
    """Flat panel from a 2D outline in the XZ plane (front view), extruded backwards along +Y.
    Used for shirt fronts, ties and lapels that sit on the chest."""
    bm = bmesh.new()
    front = [bm.verts.new((x, y_front, z)) for x, z in points_xz]
    back = [bm.verts.new((x, y_front + depth, z)) for x, z in points_xz]
    bm.faces.new(list(reversed(front)))
    bm.faces.new(back)
    count = len(points_xz)
    for i in range(count):
        j = (i + 1) % count
        bm.faces.new((front[i], front[j], back[j], back[i]))
    return bm


def deform(bm, function):
    """Moves every vertex: co = function(co) (sculpting by formula: jaws, tapers...)."""
    for vertex in bm.verts:
        vertex.co = Vector(function(vertex.co.copy()))
    return bm


def cut(bm, predicate):
    """Deletes every vertex whose world position matches `predicate(co)` (opens shells)."""
    doomed = [v for v in bm.verts if predicate(v.co)]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    return bm


# --- Character assembly -------------------------------------------------------

class Character:
    """Collects parts (one vertex group = one bone each) and joins them into one mesh."""

    def __init__(self, name):
        self.name = name
        self.parts = []

    def add(self, bm, bone, mat, smooth=False, bevel=0.0, subdivide=0):
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new("%s_%d" % (self.name, len(self.parts)))
        bm.to_mesh(mesh)
        bm.free()
        mesh.materials.append(mat)
        for polygon in mesh.polygons:
            polygon.use_smooth = smooth
        obj = bpy.data.objects.new(mesh.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        if bevel > 0:
            modifier = obj.modifiers.new("Bevel", "BEVEL")
            modifier.width = bevel
            modifier.segments = 2
            modifier.limit_method = "ANGLE"
        if subdivide > 0:
            modifier = obj.modifiers.new("Subdivision", "SUBSURF")
            modifier.levels = modifier.render_levels = subdivide
        if obj.modifiers:
            bpy.context.view_layer.update()
            baked = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
            obj.modifiers.clear()
            old = obj.data
            obj.data = baked
            bpy.data.meshes.remove(old)
            if not obj.data.materials:
                obj.data.materials.append(mat)
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
        self.parts.append(obj)

    def join(self):
        for obj in bpy.context.scene.objects:
            obj.select_set(False)
        for obj in self.parts:
            obj.select_set(True)
        main = self.parts[0]
        bpy.context.view_layer.objects.active = main
        bpy.ops.object.join()
        main.name = main.data.name = self.name
        return main


def build_rig(name, bones):
    """bones: [(name, head, tail, parent_or_None)] in world space."""
    data = bpy.data.armatures.new(name + "Rig")
    rig = bpy.data.objects.new(name + "Rig", data)
    bpy.context.scene.collection.objects.link(rig)
    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for bone_name, head, tail, parent in bones:
        edit_bone = data.edit_bones.new(bone_name)
        edit_bone.head, edit_bone.tail = Vector(head), Vector(tail)
        if parent:
            edit_bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "QUATERNION"
    return rig


def bind(mesh, rig):
    missing = {g.name for g in mesh.vertex_groups} - {b.name for b in rig.data.bones}
    if missing:
        raise ValueError("Vertex groups without bones: %s" % sorted(missing))
    mesh.parent = rig
    mesh.modifiers.new("Armature", "ARMATURE").object = rig


# --- Animation ----------------------------------------------------------------

def animate(rig, name, keys):
    """Bakes an action. keys = {frame: {bone: values}} with values in WORLD axes:
      "rot": (x, y, z) euler radians, or "spin": ((axis), angle), pivoting at the bone head
      "loc": (x, y, z) meters, "scale": uniform float.
    Bones not listed in a frame return to rest pose at that frame.
    """
    if rig.animation_data is None:
        rig.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    previous = {}
    for frame in sorted(keys):
        pose = keys[frame]
        for pose_bone in rig.pose.bones:
            values = pose.get(pose_bone.name, {})
            rest = pose_bone.bone.matrix_local.to_3x3()
            to_local = rest.inverted()
            if "spin" in values:
                axis, angle = values["spin"]
                world_rotation = Matrix.Rotation(angle, 3, Vector(axis).normalized())
            else:
                world_rotation = Euler(values.get("rot", (0, 0, 0)), "XYZ").to_matrix()
            quaternion = (to_local @ world_rotation @ rest).to_quaternion()
            last = previous.get(pose_bone.name)
            if last is not None and last.dot(quaternion) < 0:
                quaternion.negate()  # keep the shortest path between keys
            previous[pose_bone.name] = quaternion.copy()
            pose_bone.rotation_quaternion = quaternion
            pose_bone.location = to_local @ Vector(values.get("loc", (0, 0, 0)))
            scale = values.get("scale", 1.0)
            pose_bone.scale = (scale, scale, scale)
            for path in ("rotation_quaternion", "location", "scale"):
                pose_bone.keyframe_insert(path, frame=frame)
    return action


# --- Export & preview -----------------------------------------------------------

def export_glb(rig, default_action, filename):
    os.makedirs(MODELS_DIR, exist_ok=True)
    rig.animation_data.action = bpy.data.actions[default_action]
    bpy.context.scene.frame_set(1)
    path = os.path.join(MODELS_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_animation_mode="ACTIONS",
        export_def_bones=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    print("EXPORTED %s (%.1f KB)" % (path, os.path.getsize(path) / 1024))
    return path


def _look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def stage(target_z):
    """Dark cyberpunk studio: floor, neon floor ring, key light, cyan + magenta rims."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new("PreviewWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.005, 0.01, 1)
    scene.world = world

    floor = bpy.data.meshes.new("PreviewFloor")
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=64, radius=3.0)
    bm.to_mesh(floor)
    bm.free()
    floor.materials.append(material("PreviewFloorMat", "#0a0d16", roughness=0.25, metallic=0.6))
    scene.collection.objects.link(bpy.data.objects.new("PreviewFloor", floor))
    ring = bpy.data.meshes.new("PreviewRing")
    bm = torus(0.75, 0.012, (0, 0, 0.005), major_segments=64, minor_segments=4)
    bm.to_mesh(ring)
    bm.free()
    ring.materials.append(material("PreviewRingMat", "#001b22", emission="#00e5ff", strength=6))
    scene.collection.objects.link(bpy.data.objects.new("PreviewRing", ring))

    for name, color, energy, location in (
        ("Key", "#dfe8ff", 330, (-2.0, -2.6, 3.2)),
        ("Fill", "#e8ecf4", 90, (2.4, -2.8, 1.4)),
        # Neutral rims so material colors read true in reviews.
        ("RimCool", "#bcd8ff", 220, (-2.2, 2.2, 2.0)),
        ("RimWarm", "#ffe0bd", 45, (2.4, 1.8, 1.6)),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.size = 2.0
        light_data.color = hex_to_linear(color)
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        scene.collection.objects.link(light)
        _look_at(light, (0, 0, target_z))

    camera = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
    camera.data.lens = 70
    camera.location = (2.1, -4.4, target_z + 0.45)
    scene.collection.objects.link(camera)
    _look_at(camera, (0, 0, target_z))
    scene.camera = camera


def prepare_render():
    scene = bpy.context.scene
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    scene.render.resolution_x, scene.render.resolution_y = 900, 1100
    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            scene.render.engine = engine
            scene.eevee.taa_render_samples = 32
            return
        except TypeError:
            continue


def render_still(filename):
    scene = bpy.context.scene
    scene.render.filepath = os.path.join(PREVIEW_DIR, filename)
    try:
        bpy.ops.render.render(write_still=True)
    except RuntimeError:
        scene.render.engine = "BLENDER_WORKBENCH"
        bpy.ops.render.render(write_still=True)
    print("PREVIEW", scene.render.filepath)


def render_previews(rig, shots, target_z, name):
    """shots: [(action, frame, suffix)]. Writes blender/previews/<name><suffix>.png."""
    stage(target_z)
    prepare_render()
    for action, frame, suffix in shots:
        rig.animation_data.action = bpy.data.actions[action]
        bpy.context.scene.frame_set(frame)
        render_still(name + suffix + ".png")
