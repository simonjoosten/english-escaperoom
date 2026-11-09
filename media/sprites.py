import bpy, bmesh, math, os, random

SPRITE = os.environ["SPRITE"]
OUT = os.environ["OUT"]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        sc.render.engine = name
        break
    except TypeError:
        pass
try:
    sc.eevee.taa_render_samples = 64
except Exception:
    pass
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 256
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.filepath = OUT

w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.8, 0.85, 1, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8

def mat(color, metallic=0.0, rough=0.5, emit=None, strength=0):
    m = bpy.data.materials.new("m"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m

def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

def srgb(c):  # rough sRGB -> linear
    return tuple(x ** 2.2 for x in c)

def col(h): return srgb(hexc(h))

def add(kind, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), m=None, **kw):
    if kind == 'sphere': bpy.ops.mesh.primitive_uv_sphere_add(location=loc, segments=48, ring_count=24, **kw)
    elif kind == 'cube': bpy.ops.mesh.primitive_cube_add(location=loc, **kw)
    elif kind == 'cone': bpy.ops.mesh.primitive_cone_add(location=loc, vertices=48, **kw)
    elif kind == 'cyl': bpy.ops.mesh.primitive_cylinder_add(location=loc, vertices=48, **kw)
    elif kind == 'torus': bpy.ops.mesh.primitive_torus_add(location=loc, major_segments=64, minor_segments=16, **kw)
    o = bpy.context.active_object
    o.scale = scale; o.rotation_euler = rot
    if m: o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o

def light(kind, loc, energy, rot=None, size=None, color=(1, 1, 1)):
    bpy.ops.object.light_add(type=kind, location=loc)
    l = bpy.context.active_object; l.data.energy = energy; l.data.color = color
    if rot: l.rotation_euler = rot
    if size: l.data.size = size
    return l

def cam_top(scale):
    bpy.ops.object.camera_add(location=(0, 0, 12))
    c = bpy.context.active_object
    c.data.type = 'ORTHO'; c.data.ortho_scale = scale
    sc.camera = c

def cam_front(scale, z=0.0):
    bpy.ops.object.camera_add(location=(0, -12, z), rotation=(math.radians(90), 0, 0))
    c = bpy.context.active_object
    c.data.type = 'ORTHO'; c.data.ortho_scale = scale
    sc.camera = c

# ------------------------------------------------------------------ boat (top view, bow = +Y)
def boat():
    wood = mat(col('#9a5b2e'), 0, 0.5); wood2 = mat(col('#d9a066'), 0, 0.5)
    red = mat(col('#e8394f'), 0, 0.35); white = mat(col('#f7f4ee'), 0, 0.6)
    gold = mat(col('#ffd43b'), 1, 0.25); blue = mat(col('#2d78bd'), 0, 0.4)
    add('sphere', (0, -0.15, 0.15), (0.8, 1.3, 0.24), m=wood)                          # hull
    add('cone', (0, 1.0, 0.15), (0.74, 0.26, 1.05), rot=(-math.pi / 2, 0, 0), m=wood, radius1=1, depth=1)  # pointed bow
    add('sphere', (0, -0.15, 0.32), (0.66, 1.16, 0.14), m=wood2)                        # deck
    add('cone', (0, 0.95, 0.3), (0.6, 0.12, 0.8), rot=(-math.pi / 2, 0, 0), m=wood2, radius1=1, depth=1)
    add('torus', (0, -0.15, 0.37), (0.66, 1.16, 1), m=red, major_radius=1, minor_radius=0.05)   # red stripe
    add('cube', (0, -0.85, 0.55), (0.38, 0.3, 0.18), m=white)                           # cabin
    add('cube', (0, -0.85, 0.76), (0.42, 0.34, 0.05), m=red)                            # cabin roof
    add('cyl', (0, 0.2, 0.7), (1, 1, 1), m=wood, radius=0.06, depth=1.2)                # mast
    sail = add('cube', (0.0, 0.2, 1.2), (0.55, 0.62, 0.025), m=white)                   # sail seen from above
    sail.rotation_euler = (0, math.radians(8), math.radians(18))
    add('cube', (0.0, 0.2, 1.23), (0.5, 0.1, 0.03), m=blue).rotation_euler = (0, math.radians(8), math.radians(18))
    add('sphere', (0, 0.2, 1.35), (1, 1, 1), m=gold, radius=0.1)
    light('AREA', (3, -3, 8), 900, size=6)
    light('POINT', (-4, 3, 5), 350)
    cam_top(3.7)
    bpy.context.scene.camera.location = (0, 0.15, 12)

# ------------------------------------------------------------------ shark (top view, head = +Y)
def shark():
    grey = mat(col('#6f90ad'), 0, 0.35); dark = mat(col('#4b6781'), 0, 0.4)
    black = mat(col('#0a0a12'), 0, 0.2); white = mat(col('#ffffff'), 0, 0.3); pink = mat(col('#d9576b'), 0, 0.4)
    add('sphere', (0, 0, 0.35), (0.72, 1.6, 0.45), m=grey)
    add('cone', (0, 1.35, 0.35), (0.62, 0.4, 0.85), rot=(-math.pi / 2, 0, 0), m=grey, radius1=1, depth=1)   # snout
    add('cone', (0, 0.05, 0.85), (0.16, 0.8, 0.8), m=dark, radius1=1, depth=1)                             # dorsal fin
    for sx in (-1, 1):
        add('sphere', (sx * 0.95, 0.55, 0.3), (0.55, 0.22, 0.07), rot=(0, 0, math.radians(sx * -30)), m=dark)
        add('sphere', (sx * 0.34, 1.2, 0.6), (1, 1, 1), m=white, radius=0.14)
        add('sphere', (sx * 0.35, 1.25, 0.64), (1, 1, 1), m=black, radius=0.08)
        add('sphere', (sx * 0.5, -1.9, 0.3), (0.5, 0.2, 0.06), rot=(0, 0, math.radians(sx * -35)), m=dark)  # tail lobes
    add('cone', (0, -1.7, 0.35), (0.42, 0.22, 0.75), rot=(math.pi / 2, 0, 0), m=grey, radius1=1, depth=1)  # tail base
    add('sphere', (0, 1.85, 0.3), (0.3, 0.1, 0.08), m=pink)                                                 # mouth
    light('AREA', (3, -3, 8), 900, size=6)
    light('POINT', (-4, 3, 5), 350)
    cam_top(5.4)
    bpy.context.scene.camera.location = (0, -0.1, 12)

# ------------------------------------------------------------------ rocks
def rock(seed, color):
    random.seed(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=(0, 0, 0.35))
    o = bpy.context.active_object
    bm = bmesh.new(); bm.from_mesh(o.data)
    for v in bm.verts:
        n = 0.78 + random.random() * 0.45
        v.co *= n
        v.co.x *= 1.15; v.co.y *= 0.95; v.co.z *= 0.6
    bm.to_mesh(o.data); bm.free()
    for p in o.data.polygons: p.use_smooth = False
    o.data.materials.append(mat(col(color), 0, 0.85))
    # moss patch on top
    add('sphere', (0.12, 0.05, 0.62), (0.55, 0.45, 0.14), m=mat(col('#5da35a'), 0, 0.9))
    # foam ring around the base
    add('torus', (0, 0, 0.02), (1.15, 1.0, 0.3), m=mat(col('#ffffff'), 0, 0.5, emit=(1, 1, 1), strength=0.6), major_radius=1.0, minor_radius=0.08)
    light('AREA', (3, -3, 8), 800, size=6)
    light('POINT', (-4, 3, 5), 300)
    cam_top(3.6)

# ------------------------------------------------------------------ portraits
def portrait(skin, hair, shirt, style):
    sk = mat(col(skin), 0, 0.5); hr = mat(col(hair), 0, 0.5); sh = mat(col(shirt), 0, 0.6)
    black = mat(col('#1a1330'), 0, 0.2); white = mat(col('#ffffff'), 0, 0.3)
    pink = mat(col('#ff8fa0'), 0, 0.5); red = mat(col('#c0392b'), 0, 0.4)
    gold = mat(col('#ffd43b'), 1, 0.3)
    add('sphere', (0, 0, -1.15), (1.25, 0.7, 0.85), m=sh)                     # shoulders
    add('cyl', (0, 0, -0.45), (1, 1, 1), m=sk, radius=0.22, depth=0.4)       # neck
    add('sphere', (0, 0, 0.3), (0.95, 0.9, 1.0), m=sk)                        # head
    for sx in (-1, 1):
        add('sphere', (sx * 0.3, -0.82, 0.45), (1, 1, 1), m=white, radius=0.17)
        add('sphere', (sx * 0.3, -0.95, 0.45), (1, 1, 1), m=black, radius=0.09)
        add('sphere', (sx * 0.3, -1.0, 0.5), (1, 1, 1), m=white, radius=0.03)
        add('sphere', (sx * 0.52, -0.72, 0.15), (1, 1, 1), m=pink, radius=0.13)  # cheeks
        add('sphere', (sx * 0.96, 0, 0.3), (0.5, 0.5, 1), m=sk, radius=0.17)     # ears
    add('sphere', (0, -0.9, 0.22), (1, 1, 1), m=sk, radius=0.1)               # nose
    add('sphere', (0, -0.86, -0.02), (0.2, 0.06, 0.07), m=red, radius=1)
    if style == 'long':
        add('sphere', (0, 0.1, 0.45), (1.02, 0.95, 1.0), m=hr)
        add('sphere', (-0.78, -0.1, -0.2), (0.35, 0.5, 1.1), m=hr)
        add('sphere', (0.78, -0.1, -0.2), (0.35, 0.5, 1.1), m=hr)
        add('sphere', (0, -0.55, 0.88), (0.95, 0.4, 0.35), m=hr)             # fringe
    elif style == 'short':
        add('sphere', (0, 0.12, 0.55), (1.0, 0.95, 0.85), m=hr)
        add('sphere', (0, -0.5, 0.95), (0.8, 0.4, 0.3), m=hr)
    elif style == 'bun':
        add('sphere', (0, 0.12, 0.5), (1.0, 0.95, 0.92), m=hr)
        add('sphere', (0, 0.1, 1.45), (1, 1, 1), m=hr, radius=0.38)           # bun
        add('sphere', (0, -0.55, 0.9), (0.95, 0.4, 0.33), m=hr)
    elif style == 'captain':
        add('sphere', (0, 0.14, 0.5), (1.0, 0.95, 0.85), m=hr)
        add('cyl', (0, -0.05, 1.12), (1, 1, 1), m=white, radius=0.82, depth=0.5)
        add('cyl', (0, -0.3, 0.9), (1.35, 1.1, 1), m=white, radius=0.82, depth=0.1)
        add('cyl', (0, -0.62, 1.05), (1, 0.35, 1), m=gold, radius=0.32, depth=0.12, rotation=(math.radians(90), 0, 0)) if False else None
        add('sphere', (0, -0.78, 1.1), (1, 0.4, 1), m=gold, radius=0.2)
        add('sphere', (0, -0.62, 0.0), (1.6, 0.8, 0.9), m=hr, radius=0.45)    # beard
    light('AREA', (2, -6, 5), 500, size=5)
    light('POINT', (-4, -4, 3), 250)
    cam_front(3.4, z=-0.2)

if SPRITE == 'boat': boat()
elif SPRITE == 'shark': shark()
elif SPRITE == 'rock_a': rock(3, '#7b8190')
elif SPRITE == 'rock_b': rock(11, '#8a7a6a')
elif SPRITE == 'p_mia': portrait('#f6c9a0', '#6b3a22', '#ff8fb1', 'long')
elif SPRITE == 'p_tom': portrait('#e9b88a', '#2b1d14', '#4dabf7', 'short')
elif SPRITE == 'p_lisa': portrait('#f3cba8', '#d98c2b', '#9b7bff', 'bun')
elif SPRITE == 'p_finn': portrait('#e0a982', '#b9b9c6', '#2f5fa8', 'captain')

bpy.ops.render.render(write_still=True)
print("DONE", SPRITE)
