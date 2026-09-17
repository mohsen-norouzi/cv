"""Export the supplied plain sign and matching arrows. No image textures.
Blender --background --factory-startup --python scripts/export-signs.py
"""
from pathlib import Path
import bpy
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
# Blender 5.1 compatibility for the unused light embedded in this FBX.
light = bpy.data.lights.new('Import compatibility', 'POINT')
if hasattr(light, 'cycles') and not hasattr(light.cycles, 'cast_shadow'):
    setattr(type(light.cycles), 'cast_shadow', bpy.props.BoolProperty())
bpy.ops.import_scene.fbx(filepath=str(ROOT / 'assets/woodsign/normal.fbx'))
source = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
verts = [source.matrix_world @ v.co * .65 for v in source.data.vertices]
faces = [list(p.vertices) for p in source.data.polygons]
# Planar painted faces retain the authored irregular silhouette and slant.
for base in (8, 16, 24):
    front = [base+i for i in (0, 1, 5, 4)]
    y = min(verts[i].y for i in front)
    for i in front: verts[i].y = y

def panel(points):
    center = sum(points, Vector()) / 4
    return [[(center + (p-center)*.82).x, (center + (p-center)*.82).z,
             -(center + (p-center)*.82).y + .006] for p in points]
normal_panels = [panel([verts[b+i] for i in (0,4,5,1)]) for b in (8,24,16)]
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)

def mesh(name, points, polygons, panels, components):
    data = bpy.data.meshes.new(name)
    data.from_pydata(points, [], polygons); data.update()
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    obj['panels'] = panels
    colors = data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    for p in data.polygons:
        p.use_smooth = False
        factor = components[p.vertices[0]]
        for loop in p.loop_indices: colors.data[loop].color = (factor,factor,factor,1)
    return obj
mesh('Normal', verts, faces, normal_panels, [.72]*8+[1]*8+[1.04]*8+[.92]*8)

def arrow(name, split):
    points = [v.copy() for v in verts[:8]]
    polygons = [f for f in faces if max(f)<8]
    # Post ends just above the top board.
    for p in points: p.z = min(p.z,1.67)
    colors = [.72]*8; panels=[]
    for row,(height,direction) in enumerate([(1.43,-1),(1.04,1)] if split else [(1.43,1)]):
        shape=[(-.68,-.17),(.47,-.17),(.80,0),(.47,.17),(-.68,.17)]
        start=len(points); first_face=len(polygons)
        for y in (-.12,.07):
            for x,z in shape: points.append(Vector((x*direction,y,height+z-.045*x)))
        polygons.extend([[start+i for i in (0,1,2,3,4)], [start+i for i in (9,8,7,6,5)]])
        for i in range(5): polygons.append([start+i,start+(i+1)%5,start+(i+1)%5+5,start+i+5])
        if direction < 0:
            for i in range(first_face,len(polygons)): polygons[i].reverse()
        colors.extend([1 if row==0 else .92]*10)
        # Lettering remains readable even when the wooden arrow points left.
        panels.append([[x,height+z-.045*x*direction,.126] for x,z in [(-.47,-.13),(.47,-.13),(.47,.13),(-.47,.13)]])
    mesh(name,points,polygons,panels,colors)
arrow('Arrow',False); arrow('Split',True)
output=ROOT/'public/optimized/signs'; output.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output/'woodsign.glb'), export_format='GLB',export_materials='NONE',export_extras=True,export_yup=True)
