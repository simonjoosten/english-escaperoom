import bpy, math, os, random

OUT = os.environ.get("OUT", "/tmp/victory.mp4")
STILL = os.environ.get("STILL")

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, 150
sc.render.fps = 30
sc.render.resolution_x = sc.render.resolution_y = 720
for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        sc.render.engine = name
        break
    except TypeError:
        pass
try:
    sc.eevee.taa_render_samples = 40
except Exception:
    pass

def hexc(h):
    h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

def mat(color, metallic=0.0, rough=0.5, emit=None, strength=0):
    m = bpy.data.materials.new("m"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*hexc(color), 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*hexc(emit), 1)
        b.inputs["Emission Strength"].default_value = strength
    return m

def add(kind, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), m=None, parent=None, **kw):
    if kind == 'cube': bpy.ops.mesh.primitive_cube_add(location=loc, **kw)
    elif kind == 'sphere': bpy.ops.mesh.primitive_uv_sphere_add(location=loc, segments=32, ring_count=16, **kw)
    elif kind == 'cyl': bpy.ops.mesh.primitive_cylinder_add(location=loc, vertices=40, **kw)
    elif kind == 'cone': bpy.ops.mesh.primitive_cone_add(location=loc, vertices=40, **kw)
    elif kind == 'torus': bpy.ops.mesh.primitive_torus_add(location=loc, major_segments=48, minor_segments=14, **kw)
    elif kind == 'ico': bpy.ops.mesh.primitive_ico_sphere_add(location=loc, subdivisions=2, **kw)
    o = bpy.context.active_object
    o.scale = scale; o.rotation_euler = rot
    if m: o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    if parent: o.parent = parent
    return o

def key(o, f, **kw):
    for k, v in kw.items():
        setattr(o, k, v); o.keyframe_insert(data_path=k, frame=f)

def light(kind, loc, energy, color=(1, 1, 1), size=None):
    bpy.ops.object.light_add(type=kind, location=loc)
    l = bpy.context.active_object; l.data.energy = energy; l.data.color = color
    if size: l.data.size = size
    return l

# ------------------------------------------------------------ world + floor
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.012, 0.05, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
fl = bpy.context.active_object; fl.data.materials.append(mat('#1b1235', 0.3, 0.22))

# ------------------------------------------------------------ the chest
gold = mat('#ffd24a', 1.0, 0.2); wood = mat('#7a4a26', 0, 0.55); dark = mat('#2a170a', 0, 0.8)
W, D, H = 1.8, 1.0, 0.7
add('cube', (0, 0, H / 2), (W / 2, D / 2, H / 2), m=wood)
for z in (0.05, H - 0.05): add('cube', (0, 0, z), (W / 2 + .02, D / 2 + .02, .04), m=gold)
for x in (-W / 2 + .13, W / 2 - .13): add('cube', (x, 0, H / 2), (.07, D / 2 + .02, H / 2 + .0), m=gold)
add('cube', (0, 0, H + .003), (W / 2 - .06, D / 2 - .06, .02), m=dark)
# gold heap inside
add('sphere', (0, 0, H - .02), (W / 2 - .12, D / 2 - .1, .26), m=gold)
random.seed(5)
coin_mesh = None
for i in range(70):
    a = random.uniform(0, math.tau); r = random.uniform(0, 1) ** .5
    x, y = math.cos(a) * (W / 2 - .2) * r, math.sin(a) * (D / 2 - .17) * r
    z = H + .1 + .22 * (1 - r * r) + random.uniform(0, .05)
    c = add('cyl', (x, y, z), (1, 1, 1), rot=(random.uniform(-.7, .7), random.uniform(-.7, .7), random.uniform(0, 6)), m=gold, radius=.1, depth=.028)
# lid (hinged at the back edge)
bpy.ops.object.empty_add(location=(0, D / 2, H)); piv = bpy.context.active_object
lid = add('cyl', (0, -D / 2, 0), (1, 1, 1), rot=(0, math.pi / 2, 0), m=wood, radius=D / 2, depth=W, parent=piv)
for x in (-.55, .55): add('cyl', (x, -D / 2, 0), (1, 1, 1), rot=(0, math.pi / 2, 0), m=gold, radius=D / 2 + .025, depth=.12, parent=piv)
add('cube', (0, -D - .02, -.1), (.12, .03, .15), m=gold, parent=piv)           # lock plate
key(piv, 1, rotation_euler=(0, 0, 0)); key(piv, 14, rotation_euler=(0, 0, 0))
key(piv, 42, rotation_euler=(math.radians(-118), 0, 0))
for fc in piv.animation_data.action.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'

# ------------------------------------------------------------ the trophy
bpy.ops.object.empty_add(location=(0, 0, H)); tr = bpy.context.active_object
add('cyl', (0, 0, 0.06), (1, 1, 1), m=gold, parent=tr, radius=.34, depth=.12)
add('cyl', (0, 0, 0.16), (1, 1, 1), m=gold, parent=tr, radius=.24, depth=.1)
add('cyl', (0, 0, 0.5), (1, 1, 1), m=gold, parent=tr, radius=.07, depth=.55)
add('sphere', (0, 0, 0.42), (1, 1, 1), m=gold, parent=tr, radius=.14)
add('cone', (0, 0, 1.0), (1, 1, 1), m=gold, parent=tr, radius1=.12, radius2=.42, depth=.62)
add('torus', (0, 0, 1.31), (1, 1, 1), m=gold, parent=tr, major_radius=.42, minor_radius=.03)
for sx in (-1, 1): add('torus', (sx * .46, 0, 1.05), (1, 1, 1), rot=(math.pi / 2, 0, 0), m=gold, parent=tr, major_radius=.17, minor_radius=.035)
star = add('ico', (0, 0, 1.72), (1, 1, 1), m=mat('#fff3a0', 0, .3, emit='#ffd24a', strength=6), parent=tr, radius=.17)
gl = light('POINT', (0, 0, 1.2), 0, color=(1, .8, .4)); gl.parent = tr
key(tr, 1, location=(0, 0, H - .1), scale=(.001, .001, .001), rotation_euler=(0, 0, 0))
key(tr, 34, location=(0, 0, H - .1), scale=(.001, .001, .001), rotation_euler=(0, 0, 0))
key(tr, 80, location=(0, 0, 1.55), scale=(1.15, 1.15, 1.15), rotation_euler=(0, 0, math.radians(300)))
key(tr, 150, location=(0, 0, 1.55 + .08), scale=(1.15, 1.15, 1.15), rotation_euler=(0, 0, math.radians(720)))
for fc in tr.animation_data.action.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
gl.data.energy = 0; gl.data.keyframe_insert(data_path="energy", frame=34)
gl.data.energy = 500; gl.data.keyframe_insert(data_path="energy", frame=80)

# ------------------------------------------------------------ coins flying out
random.seed(11)
G = 9.8
for i in range(38):
    start = 40 + random.randint(0, 22)
    vx, vy, vz = random.uniform(-2.4, 2.4), random.uniform(-2.9, -.2), random.uniform(3.2, 6.2)
    c = add('cyl', (0, 0, H), (1, 1, 1), m=gold, radius=.1, depth=.028)
    sx, sy = random.uniform(-.5, .5), random.uniform(-.2, .2)
    key(c, 1, location=(sx, sy, H), scale=(0, 0, 0)); key(c, start - 1, location=(sx, sy, H), scale=(0, 0, 0))
    spin = (random.uniform(6, 14), random.uniform(6, 14))
    x, y, z, t, f = sx, sy, H, 0.0, start
    vzz = vz; bounced = False
    while f < 150 and t < 2.6:
        key(c, f, location=(x, y, z), rotation_euler=(t * spin[0], t * spin[1], 0), scale=(1, 1, 1))
        dt = 3 / 30.0
        t += dt; f += 3
        x += vx * dt; y += vy * dt
        vzz -= G * dt; z += vzz * dt
        if z <= .0145:
            z = .0145
            if not bounced: vzz = -vzz * .35; bounced = True
            else: vzz = 0; vx *= .3; vy *= .3
    key(c, f, location=(x, y, .0145), rotation_euler=(t * spin[0], t * spin[1], 0), scale=(1, 1, 1))

# ------------------------------------------------------------ fireworks
random.seed(21)
colors = ['#ff5d73', '#ffd43b', '#38b6ff', '#3ddc84', '#c07bff', '#ff9a3c']
bursts = [(60, -2.4, 1.2, 3.6), (72, 2.5, 1.0, 3.9), (86, -.4, 2.2, 4.4), (100, 2.1, 2.0, 3.3), (114, -2.6, 2.0, 4.0), (126, .6, 1.4, 4.6)]
for bi, (bf, cx, cy, cz) in enumerate(bursts):
    sm = mat('#ffffff', 0, .4, emit=colors[bi % len(colors)], strength=14)
    for k in range(26):
        s = add('sphere', (cx, cy, cz), (1, 1, 1), m=sm, radius=.055)
        th = random.uniform(0, math.tau); ph = math.acos(random.uniform(-1, 1)); sp = random.uniform(1.4, 2.4)
        dx, dy, dz = math.sin(ph) * math.cos(th) * sp, math.sin(ph) * math.sin(th) * sp, math.cos(ph) * sp
        key(s, 1, location=(cx, cy, cz), scale=(0, 0, 0)); key(s, bf - 1, location=(cx, cy, cz), scale=(0, 0, 0))
        for step in range(0, 11):
            tau = step * 3 / 30.0
            fr = bf + step * 3
            if fr > 150: break
            p = (cx + dx * tau * (1 - tau * .35), cy + dy * tau * (1 - tau * .35), cz + dz * tau * (1 - tau * .35) - 1.6 * tau * tau)
            sc_ = max(0.01, 1.2 * (1 - tau / 1.05)) if step < 10 else 0
            key(s, fr, location=p, scale=(sc_, sc_, sc_))

# ------------------------------------------------------------ lights
light('AREA', (0, -5, 6), 520, size=6)
light('POINT', (-5, -3, 3), 700, color=(.6, .45, 1.0))
light('POINT', (5, -3, 2.5), 500, color=(.3, .7, 1.0))
chest_glow = light('POINT', (0, 0, H + .4), 0, color=(1, .78, .3))
for f, e in ((1, 0), (24, 0), (44, 1800), (150, 900)):
    chest_glow.data.energy = e; chest_glow.data.keyframe_insert(data_path="energy", frame=f)

# ------------------------------------------------------------ camera
bpy.ops.object.empty_add(location=(0, 0, 1.35)); target = bpy.context.active_object
bpy.ops.object.camera_add(location=(-1.5, -6.6, 1.8)); cam = bpy.context.active_object
cam.data.lens = 36
tc = cam.constraints.new('TRACK_TO'); tc.target = target; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
key(cam, 1, location=(-1.5, -6.6, 1.8)); key(cam, 75, location=(0, -5.5, 2.3)); key(cam, 150, location=(1.3, -4.9, 2.7))
for fc in cam.animation_data.action.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
sc.camera = cam

# bloom
try:
    sc.use_nodes = True; nt = sc.node_tree; nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers"); g = nt.nodes.new("CompositorNodeGlare"); co = nt.nodes.new("CompositorNodeComposite")
    try: g.glare_type = 'FOG_GLOW'
    except Exception: pass
    g.threshold = 1.0
    nt.links.new(rl.outputs["Image"], g.inputs["Image"]); nt.links.new(g.outputs["Image"], co.inputs["Image"])
except Exception as e:
    print("no glow", e)

if STILL:
    sc.frame_set(int(STILL)); sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
else:
    sc.render.image_settings.file_format = 'FFMPEG'; sc.render.ffmpeg.format = 'MPEG4'
    sc.render.ffmpeg.codec = 'H264'; sc.render.ffmpeg.constant_rate_factor = 'MEDIUM'
    sc.render.filepath = OUT
    bpy.ops.render.render(animation=True)
print("DONE", OUT)
