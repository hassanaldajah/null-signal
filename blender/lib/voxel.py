"""Tiny voxel (3D pixel-art) toolkit.

A model is a dict of integer cells (x, y, z) -> (color, group). `group` is the bone that moves
the voxel. Meshing emits only faces that touch empty space inside the same group, so parts that
animate separately stay closed. Flat shading keeps the crisp pixel look.

Axes: x = character's left, -y = front, z = up. Cell (x, y, z) spans [x, x+1] * size.
"""
import bmesh
import bpy

import ns_common as ns

FACES = (
    ((1, 0, 0), ((1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1))),
    ((-1, 0, 0), ((0, 1, 0), (0, 0, 0), (0, 0, 1), (0, 1, 1))),
    ((0, 1, 0), ((1, 1, 0), (0, 1, 0), (0, 1, 1), (1, 1, 1))),
    ((0, -1, 0), ((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1))),
    ((0, 0, 1), ((0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1))),
    ((0, 0, -1), ((0, 1, 0), (1, 1, 0), (1, 0, 0), (0, 0, 0))),
)


class VoxelModel:
    def __init__(self):
        self.cells = {}

    def box(self, x, y, z, color, group, hollow=False):
        """Fills ranges x=(x0, x1), y=(y0, y1), z=(z0, z1) (end exclusive)."""
        for i in range(*x):
            for j in range(*y):
                for k in range(*z):
                    edge = i in (x[0], x[1] - 1) or j in (y[0], y[1] - 1)
                    if hollow and not edge:
                        continue
                    self.cells[(i, j, k)] = (color, group)

    def paint(self, cells, color):
        """Recolors existing cells (keeps their group)."""
        for cell in cells:
            if cell in self.cells:
                self.cells[cell] = (color, self.cells[cell][1])

    def carve(self, predicate):
        for cell in [c for c in self.cells if predicate(*c)]:
            del self.cells[cell]

    def pixels(self, rows, origin, axis, palette, group, depth_axis=None, depth=0):
        """Places a 2D pixel drawing. rows: strings top-to-bottom; '.' = empty.
        axis 'xz' draws on a plane facing -y at y=origin[1]; letters map through `palette`."""
        ox, oy, oz = origin
        height = len(rows)
        for r, row in enumerate(rows):
            for c, char in enumerate(row):
                if char == '.':
                    continue
                z = oz + (height - 1 - r)
                if axis == 'xz':
                    self.cells[(ox + c, oy, z)] = (palette[char], group)
                elif axis == 'yz':
                    self.cells[(ox, oy + c, z)] = (palette[char], group)


def build_mesh(model, name, size, materials):
    """Returns one joined mesh object with vertex groups named after the cells' groups.
    `materials` maps color key -> bpy material; an optional "<key>~" is the checker shade."""
    keys = list(materials)
    ch = ns.Character(name)
    groups = {}
    for cell, (color, group) in model.cells.items():
        groups.setdefault(group, {})[cell] = color
    for group, cells in groups.items():
        bm = bmesh.new()
        cache = {}

        def vert(p):
            if p not in cache:
                cache[p] = bm.verts.new((p[0] * size, p[1] * size, p[2] * size))
            return cache[p]

        for (x, y, z), color in cells.items():
            for (dx, dy, dz), corners in FACES:
                if (x + dx, y + dy, z + dz) in cells:
                    continue
                face = bm.faces.new([vert((x + cx, y + cy, z + cz)) for cx, cy, cz in corners])
                # Checker shade ("<key>~" material) makes every pixel readable.
                shade = color + "~"
                face.material_index = keys.index(shade if (x + y + z) % 2 and shade in materials else color)
        mesh = bpy.data.meshes.new("%s_%s" % (name, group))
        bm.to_mesh(mesh)
        bm.free()
        for key in keys:
            mesh.materials.append(materials[key])
        obj = bpy.data.objects.new(mesh.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        obj.vertex_groups.new(name=group).add(list(range(len(mesh.vertices))), 1.0, "REPLACE")
        ch.parts.append(obj)
    joined = ch.join()
    # Drop material slots no face uses (keeps draw calls low).
    used = {p.material_index for p in joined.data.polygons}
    for index in reversed(range(len(joined.data.materials))):
        if index not in used:
            joined.active_material_index = index
            bpy.context.view_layer.objects.active = joined
            bpy.ops.object.material_slot_remove()
    return joined
