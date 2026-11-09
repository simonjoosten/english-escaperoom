import bpy, math, os, random, sys

OUT = os.environ.get("OUT", "/tmp/key.mp4")
STILL = os.environ.get("STILL")  # frame number to render as png

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, 150
sc.render.fps = 30
sc.render.resolution_x, sc.render.resolution_y = 640, 720

for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        sc.render.engine = name
        break
    except TypeError:
        pass
try:
    sc.eevee.taa_render_samples = 48
except Exception:
    pass

# ---------- helpers ----------
def mat(name, color, metallic=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m

def cube(name, loc, scale, m):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.data.materials.append(m)
    return o

def key(obj, frame, **kw):
    for k, v in kw.items():
        setattr(obj, k, v)
        obj.keyframe_insert(data_path=k, frame=frame)

def ease(obj):
    if obj.animation_data and obj.animation_data.action:
        for fc in obj.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'BEZIER'

# ---------- world ----------
w = bpy.data.worlds.new("W")
sc.world = w
w.use_nodes = True
bg = w.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.03, 0.025, 0.07, 1)
bg.inputs["Strength"].default_value = 0.12

# ---------- materials ----------
steel = mat("steel", (0.45, 0.48, 0.55), 0.9, 0.32)
darksteel = mat("darksteel", (0.12, 0.13, 0.16), 0.8, 0.45)
inside = mat("inside", (0.05, 0.04, 0.05), 0.0, 0.9)
gold = mat("gold", (1.0, 0.72, 0.12), 1.0, 0.22)
floor_m = mat("floor", (0.07, 0.06, 0.1), 0.2, 0.18)
spark_m = mat("spark", (1, 0.85, 0.3), 0, 0.5, emit=(1, 0.8, 0.2), strength=12)
glass = mat("wood", (0.22, 0.13, 0.08), 0.0, 0.6)

# ---------- floor + back wall ----------
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
f = bpy.context.active_object; f.data.materials.append(floor_m)
cube("wall", (0, 3.0, 5), (14, 0.1, 6), mat("wallm", (0.09, 0.08, 0.16), 0.0, 0.8))

# ---------- cabinet (open at the front) ----------
W, H, D = 3.0, 3.6, 0.8
t = 0.07
cube("left", (-W / 2, D / 2, H / 2), (t, D / 2, H / 2), steel)
cube("right", (W / 2, D / 2, H / 2), (t, D / 2, H / 2), steel)
cube("top", (0, D / 2, H), (W / 2 + t, D / 2, t), steel)
cube("bottom", (0, D / 2, 0.05), (W / 2 + t, D / 2, t), steel)
cube("back", (0, D, H / 2), (W / 2, t, H / 2), inside)
cube("shelf", (0, D / 2, 1.9), (W / 2, D / 2, 0.04), darksteel)
cube("feet1", (-W / 2 + 0.2, D / 2, -0.05), (0.2, D / 2 - 0.1, 0.05), darksteel)
cube("feet2", (W / 2 - 0.2, D / 2, -0.05), (0.2, D / 2 - 0.1, 0.05), darksteel)

def make_door(side):
    hinge_x = -W / 2 if side < 0 else W / 2
    bpy.ops.object.empty_add(location=(hinge_x, -0.02, 0))
    pivot = bpy.context.active_object
    pivot.name = f"pivot{side}"
    d = cube(f"door{side}", (-side * -W / 4 * -1, 0, H / 2), (W / 4, 0.05, H / 2), steel)
    d.location = (-side * (-W / 4) if False else (W / 4 if side < 0 else -W / 4), 0, H / 2)
    d.parent = pivot
    # handle (gold ring) and lock plate
    bpy.ops.mesh.primitive_torus_add(location=(0, 0, 0), major_radius=0.18, minor_radius=0.035)
    h = bpy.context.active_object; h.data.materials.append(gold)
    h.rotation_euler = (math.radians(90), 0, 0)
    h.location = (W / 2 - 0.35 if side < 0 else -(W / 2 - 0.35), -0.1, H / 2)
    h.parent = pivot
    # decorative rivets
    for zz in (0.45, H - 0.45):
        for xx in (0.2, W / 2 - 0.2):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, location=(xx if side < 0 else -xx, -0.08, zz))
            r = bpy.context.active_object; r.data.materials.append(darksteel); r.parent = pivot
    return pivot

pl, pr = make_door(-1), make_door(1)
key(pl, 1, rotation_euler=(0, 0, 0)); key(pr, 1, rotation_euler=(0, 0, 0))
key(pl, 14, rotation_euler=(0, 0, 0)); key(pr, 14, rotation_euler=(0, 0, 0))
key(pl, 44, rotation_euler=(0, 0, math.radians(-112)))
key(pr, 44, rotation_euler=(0, 0, math.radians(112)))
ease(pl); ease(pr)

# ---------- the key ----------
bpy.ops.object.empty_add(location=(0, 0.35, 2.15))
kroot = bpy.context.active_object; kroot.name = "keyroot"
bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.06, location=(-0.5, 0, 0))
ring = bpy.context.active_object; ring.data.materials.append(gold); ring.parent = kroot
bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=0.95, location=(0.05, 0, 0))
shaft = bpy.context.active_object; shaft.data.materials.append(gold)
shaft.rotation_euler = (0, math.radians(90), 0); shaft.parent = kroot
for xx, ln in ((0.38, 0.2), (0.22, 0.14)):
    c = cube("tooth", (xx, 0, -0.1), (0.05, 0.05, ln / 2), gold); c.parent = kroot
bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.03, location=(-0.5, 0, 0))
inner = bpy.context.active_object; inner.data.materials.append(gold); inner.parent = kroot
kroot.scale = (1.5, 1.5, 1.5)

# hidden inside until the doors are open, then pops out and falls
for obj in [kroot]:
    pass
kroot.hide_render = False
key(kroot, 1, location=(0, 0.45, 2.15), rotation_euler=(0, 0, 0), scale=(0.001, 0.001, 0.001))
key(kroot, 30, location=(0, 0.45, 2.15), rotation_euler=(0, 0, 0), scale=(0.001, 0.001, 0.001))
key(kroot, 40, location=(0, 0.2, 2.3), rotation_euler=(0, 0, math.radians(20)), scale=(1.5, 1.5, 1.5))
key(kroot, 50, location=(0, -0.7, 2.55), rotation_euler=(math.radians(120), 0, math.radians(35)), scale=(1.5, 1.5, 1.5))
key(kroot, 66, location=(0.1, -1.4, 0.12), rotation_euler=(math.radians(560), 0, math.radians(60)), scale=(1.5, 1.5, 1.5))
key(kroot, 74, location=(0.12, -1.55, 0.75), rotation_euler=(math.radians(640), math.radians(10), math.radians(80)), scale=(1.5, 1.5, 1.5))
key(kroot, 82, location=(0.14, -1.7, 0.12), rotation_euler=(math.radians(720), 0, math.radians(100)), scale=(1.5, 1.5, 1.5))
key(kroot, 88, location=(0.14, -1.78, 0.34), rotation_euler=(math.radians(720), 0, math.radians(110)), scale=(1.5, 1.5, 1.5))
key(kroot, 94, location=(0.14, -1.82, 0.12), rotation_euler=(math.radians(720), 0, math.radians(120)), scale=(1.5, 1.5, 1.5))
key(kroot, 150, location=(0.14, -1.82, 0.12), rotation_euler=(math.radians(720), 0, math.radians(300)), scale=(1.5, 1.5, 1.5))
ease(kroot)

# ---------- sparkles ----------
random.seed(4)
for i in range(18):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(0, 0.3, 2.2))
    s = bpy.context.active_object; s.data.materials.append(spark_m)
    ang = random.uniform(0, math.tau); r = random.uniform(0.6, 1.8)
    tx, tz = math.cos(ang) * r, 2.2 + math.sin(ang) * r * 0.8
    st = random.randint(40, 62)
    key(s, 1, location=(0, 0.3, 2.2), scale=(0, 0, 0))
    key(s, st, location=(0, -0.3, 2.2), scale=(0, 0, 0))
    key(s, st + 8, location=(tx * 0.6, -0.9, 2.2 + (tz - 2.2) * 0.6), scale=(1.4, 1.4, 1.4))
    key(s, st + 26, location=(tx, -1.4, tz - 0.4), scale=(0, 0, 0))
    ease(s)

# ---------- lights ----------
bpy.ops.object.light_add(type='AREA', location=(0, -5, 6))
a = bpy.context.active_object; a.data.energy = 380; a.data.size = 6
a.rotation_euler = (math.radians(60), 0, 0)
bpy.ops.object.light_add(type='POINT', location=(-5, -3, 3))
l = bpy.context.active_object; l.data.energy = 500; l.data.color = (0.5, 0.4, 1.0)
bpy.ops.object.light_add(type='POINT', location=(5, -3, 2.5))
l2 = bpy.context.active_object; l2.data.energy = 380; l2.data.color = (0.3, 0.7, 1.0)
bpy.ops.object.light_add(type='POINT', location=(0, 0.35, 2.0))
glow = bpy.context.active_object; glow.data.color = (1.0, 0.75, 0.25)
key_en = lambda fr, e: (setattr(glow.data, "energy", e), glow.data.keyframe_insert(data_path="energy", frame=fr))
key_en(1, 0); key_en(24, 0); key_en(46, 1500); key_en(100, 800); key_en(150, 650)

bpy.ops.object.light_add(type='POINT', location=(0.5, -4.0, 2.2))
fill = bpy.context.active_object; fill.data.energy = 450; fill.data.color = (1.0, 0.85, 0.6)
bpy.ops.object.light_add(type='POINT', location=(0, -2.5, 3.5))
top = bpy.context.active_object; top.data.energy = 260; top.data.color = (1.0, 0.9, 0.7)

# ---------- camera ----------
bpy.ops.object.empty_add(location=(0, -0.6, 1.7))
target = bpy.context.active_object
bpy.ops.object.camera_add(location=(0, -9.5, 2.3))
cam = bpy.context.active_object
cam.data.lens = 38
tc = cam.constraints.new('TRACK_TO'); tc.target = target
tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
key(cam, 1, location=(0, -9.5, 2.3))
key(cam, 150, location=(0, -7.2, 1.7))
ease(cam)
sc.camera = cam

# glow / bloom in the compositor
try:
    sc.use_nodes = True
    nt = sc.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    gl = nt.nodes.new("CompositorNodeGlare")
    try:
        gl.glare_type = 'FOG_GLOW'
    except Exception:
        pass
    gl.threshold = 1.2
    comp = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], gl.inputs["Image"])
    nt.links.new(gl.outputs["Image"], comp.inputs["Image"])
except Exception as e:
    print("no compositor glow:", e)

# ---------- render ----------
if STILL:
    sc.frame_set(int(STILL))
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
else:
    sc.render.image_settings.file_format = 'FFMPEG'
    sc.render.ffmpeg.format = 'MPEG4'
    sc.render.ffmpeg.codec = 'H264'
    sc.render.ffmpeg.constant_rate_factor = 'MEDIUM'
    sc.render.filepath = OUT
    bpy.ops.render.render(animation=True)
print("DONE", OUT)
