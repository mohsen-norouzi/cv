"""Run inside Blender 5's Python Console: exec(compile(open(path).read(),path,'exec')).
Creates a separate editable scene, three irradiance atlases, and a web GLB.
"""
import bpy, math, json, traceback, time
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/mohsen/Nova/Projects/zOthers/cv')
LOG=ROOT/'assets/bake-status.json'
START=time.time()
(ROOT/'assets/lighting').mkdir(parents=True,exist_ok=True)
def status(stage, **kw):
    LOG.write_text(json.dumps(dict(stage=stage,elapsed=round(time.time()-START),**kw),indent=2))
def active(obj):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj

def run():
  try:
    status('Importing authored coast')
    bpy.context.window.scene=bpy.data.scenes.new('HQ coast — baked lighting')
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/coast-source.glb'))
    coast=[o for o in bpy.context.scene.objects if o.type=='MESH']
    lanterns=[]
    for o in bpy.context.scene.objects:
      if 'lanterns' in o: lanterns=list(o['lanterns'])
    # Exported meshes are world-space; apply the coordinate-system parent transform.
    for o in coast:
      world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
      active(o);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    # Import only the original featured subjects as shadow/bounce contributors.
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/Try1.glb'))
    imported=set(bpy.context.scene.objects)-before
    subjects=[]
    specs=[('tripo_node_1feaf1fd-79b2-4217-a867-f97ada61b588',(-3.3,-17.6,3.75),2.65),('tripo_node_e70704d4-4ce1-4bf4-974e-d1eea2c8202b',(11.1,-7.5,6.6),3.1),('Stylized Cartoon Stone Bench',(11.5,9,11),1.)]
    for name,pos,height in specs:
      obj=next((o for o in imported if o.name.startswith(name)),None)
      if obj is None: continue
      world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
      corners=[obj.matrix_world@Vector(c) for c in obj.bound_box]
      low=Vector(tuple(min(v[i] for v in corners) for i in range(3)));high=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
      center=(low+high)/2;center.z=low.z
      scale=height/(high.z-low.z)
      obj.location=(obj.location-center)*scale+Vector(pos);obj.scale*=scale
      subjects.append(obj)
    for o in imported-set(subjects): bpy.data.objects.remove(o,do_unlink=True)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU'
    scene.cycles.samples=192;scene.cycles.use_denoising=True
    scene.cycles.max_bounces=6;scene.cycles.diffuse_bounces=4
    scene.world=bpy.data.worlds.new('Sunset atmosphere');scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.6,.63,.75,1);bg.inputs['Strength'].default_value=.6
    def light(name,kind,pos,energy,color,size):
      data=bpy.data.lights.new(name,kind);data.energy=energy;data.color=color
      if kind=='POINT': data.shadow_soft_size=size
      if kind=='SUN': data.angle=size
      obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=pos;return obj
    sun=light('Late afternoon sun','SUN',(-35,-75,24),2.6,(1,.72,.46),.13)
    sun.rotation_euler=(Vector((0,0,5))-sun.location).to_track_quat('-Z','Y').to_euler()
    for i,p in enumerate(lanterns):
      x,y,z=p;light('Amber lantern %02d'%i,'POINT',(x,-z,y),155 if i<19 else 220,(1,.48,.115),.16)
    # The visible bulb is an opaque emissive mesh in WebGL. Hide it during
    # transport baking so it does not enclose and block its own point light.
    for o in coast:
      if 'Lantern glass' in o.name:o.hide_render=True
    # Explicit bulbs give deterministic bake sampling.
    for m in bpy.data.materials:
      if m.use_nodes and 'Lantern glass' in m.name:
        for n in m.node_tree.nodes:
          if n.type=='BSDF_PRINCIPLED':n.inputs['Emission Strength'].default_value=0
    groups={'paving':[], 'landscape':[], 'foliage':[]}
    unbaked=[]
    for o in coast:
      if any(n in o.name for n in ['Lantern glass','Mountain ridge']): unbaked.append(o);continue
      key='paving' if any(n in o.name for n in ['Paving','Limestone']) else 'foliage' if any(n in o.name for n in ['Needles','Heather','oak','bronze']) else 'landscape'
      groups[key].append(o)
    baked=[]
    for key,objects in groups.items():
      status('Unwrapping '+key)
      bpy.ops.object.select_all(action='DESELECT')
      for o in objects:o.select_set(True)
      bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();obj=bpy.context.object;obj.name='Baked '+key
      # Flat face normals preserve deliberately modelled stone facets.
      bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
      bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.002 if key=='paving' else .0008,area_weight=.4)
      bpy.ops.object.mode_set(mode='OBJECT')
      size=2048 if key!='landscape' else 3072
      img=bpy.data.images.new('Irradiance '+key,width=size,height=size,float_buffer=True)
      img.colorspace_settings.name='Linear Rec.709'
      for slot in obj.material_slots:
        m=slot.material
        if m is None:continue
        m.use_nodes=True;node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;node.name='BAKE TARGET';m.node_tree.nodes.active=node
      scene.render.bake.margin=12;scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=True;scene.render.bake.use_pass_color=False
      status('Baking '+key,resolution=size)
      active(obj);bpy.ops.object.bake(type='DIFFUSE')
      scene.render.image_settings.file_format='OPEN_EXR';scene.render.image_settings.color_depth='16';scene.render.image_settings.exr_codec='ZIP'
      img.save_render(str(ROOT/('assets/lighting/'+key+'.exr')),scene=scene)
      obj['lightmap']=key
      baked.append(obj)
    # Restore the visible bulbs after the bake. Keep image nodes unconnected: the web
    # renderer uses them as irradiance, separate from the original surface albedo.
    for m in bpy.data.materials:
      if m.use_nodes and 'Lantern glass' in m.name:
        for n in m.node_tree.nodes:
          if n.type=='BSDF_PRINCIPLED':n.inputs['Emission Strength'].default_value=5
    for o in unbaked:o.hide_render=False
    status('Exporting')
    bpy.ops.object.select_all(action='DESELECT')
    for o in baked+unbaked:o.select_set(True)
    # Empty root carries the lamp locations across the modelling round trip.
    anchor=bpy.data.objects.new('Lighting metadata',None);scene.collection.objects.link(anchor);anchor['lanterns']=lanterns;anchor.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/coast-lit.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,use_active_scene=True,export_materials='EXPORT')
    # A ready-to-render camera makes the authored Blender scene reviewable.
    camera_data=bpy.data.cameras.new('Coast overview');camera=bpy.data.objects.new('Coast overview',camera_data);scene.collection.objects.link(camera)
    camera.location=(30,-48,23);camera.rotation_euler=(Vector((-7,3,10))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.sensor_fit='VERTICAL';camera_data.sensor_height=24;camera_data.lens=24/(2*math.tan(math.radians(42)/2));camera_data.clip_end=3000
    scene.camera=camera;scene.render.resolution_x=1672;scene.render.resolution_y=941;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/coast-lighting.blend'))
    status('Complete',meshes=len(baked)+len(unbaked),lanterns=len(lanterns))
  except Exception:
    status('Failed',error=traceback.format_exc())
  return None
bpy.app.timers.register(run, first_interval=1)
