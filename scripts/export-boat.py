"""Convert the supplied sailboat to one web mesh, preserving shape and UVs.
Run with Blender --background --factory-startup --python scripts/export-boat.py.
"""
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.wm.usd_import(filepath=str(ROOT/'assets/boat/boat.usdz'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for obj in meshes:
    obj.data.transform(obj.matrix_world)
    obj.parent=None;obj.matrix_world.identity()
points=[v.co for o in meshes for v in o.data.vertices]
low=Vector(tuple(min(v[i] for v in points) for i in range(3)))
high=Vector(tuple(max(v[i] for v in points) for i in range(3)))
center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
for obj in meshes:
    for v in obj.data.vertices: v.co-=center
    obj.data.materials.clear()
    obj.name='Coastal sailboat'
for obj in list(bpy.context.scene.objects):
    if obj not in meshes: bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/boat/boat-web.glb'),export_format='GLB',export_materials='NONE',export_yup=True)
print('Boat bounds',tuple(high-low),'vertices',len(points))
