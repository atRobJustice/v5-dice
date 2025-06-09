"use strict";

(function(dice) {
    // Initialize the dice object on the global $t object
    $t.dice = $t.dice || {};
    var self = $t.dice;

    var random_storage = [];
    self.use_true_random = true;
    self.frame_rate = 1 / 60;

    function prepare_rnd(callback) {
        if (!random_storage.length && $t.dice.use_true_random) {
            try {
                $t.rpc({ method: "random", n: 512 },
                function(random_response) {
                    if (!random_response.error) {
                        random_storage = random_response.result.random.data;
                    } else {
                        console.warn('Falling back to Math.random due to RPC error');
                        $t.dice.use_true_random = false;
                    }
                    callback();
                });
                return;
            }
            catch (e) {
                console.warn('Falling back to Math.random:', e);
                $t.dice.use_true_random = false;
                callback();
            }
        }
        callback();
    }

    function rnd() {
        return random_storage.length ? random_storage.pop() : Math.random();
    }

    function create_shape(vertices, faces, radius) {
        var cv = new Array(vertices.length), cf = new Array(faces.length);
        for (var i = 0; i < vertices.length; ++i) {
            var v = vertices[i];
            cv[i] = new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius);
        }
        for (var i = 0; i < faces.length; ++i) {
            cf[i] = faces[i].slice(0, faces[i].length - 1);
        }
        return new CANNON.ConvexPolyhedron(cv, cf);
    }

    function make_geom(vertices, faces, radius, tab, af) {
        var geom = new THREE.Geometry();
        for (var i = 0; i < vertices.length; ++i) {
            var vertex = vertices[i].multiplyScalar(radius);
            vertex.index = geom.vertices.push(vertex) - 1;
        }
        for (var i = 0; i < faces.length; ++i) {
            var ii = faces[i], fl = ii.length - 1;
            var aa = Math.PI * 2 / fl;
            for (var j = 0; j < fl - 2; ++j) {
                geom.faces.push(new THREE.Face3(ii[0], ii[j + 1], ii[j + 2], [geom.vertices[ii[0]],
                            geom.vertices[ii[j + 1]], geom.vertices[ii[j + 2]]], 0, ii[fl] + 1));
                geom.faceVertexUvs[0].push([
                        new THREE.Vector2((Math.cos(af) + 1 + tab) / 2 / (1 + tab),
                            (Math.sin(af) + 1 + tab) / 2 / (1 + tab)),
                        new THREE.Vector2((Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
                            (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab)),
                        new THREE.Vector2((Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab),
                            (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab))]);
            }
        }
        geom.computeFaceNormals();
        geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
        return geom;
    }

    function chamfer_geom(vectors, faces, chamfer) {
        var chamfer_vectors = [], chamfer_faces = [], corner_faces = new Array(vectors.length);
        for (var i = 0; i < vectors.length; ++i) corner_faces[i] = [];
        for (var i = 0; i < faces.length; ++i) {
            var ii = faces[i], fl = ii.length - 1;
            var center_point = new THREE.Vector3();
            var face = new Array(fl);
            for (var j = 0; j < fl; ++j) {
                var vv = vectors[ii[j]].clone();
                center_point.add(vv);
                corner_faces[ii[j]].push(face[j] = chamfer_vectors.push(vv) - 1);
            }
            center_point.divideScalar(fl);
            for (var j = 0; j < fl; ++j) {
                var vv = chamfer_vectors[face[j]];
                vv.subVectors(vv, center_point).multiplyScalar(chamfer).addVectors(vv, center_point);
            }
            face.push(ii[fl]);
            chamfer_faces.push(face);
        }
        for (var i = 0; i < faces.length - 1; ++i) {
            for (var j = i + 1; j < faces.length; ++j) {
                var pairs = [], lastm = -1;
                for (var m = 0; m < faces[i].length - 1; ++m) {
                    var n = faces[j].indexOf(faces[i][m]);
                    if (n >= 0 && n < faces[j].length - 1) {
                        if (lastm >= 0 && m != lastm + 1) pairs.unshift([i, m], [j, n]);
                        else pairs.push([i, m], [j, n]);
                        lastm = m;
                    }
                }
                if (pairs.length != 4) continue;
                chamfer_faces.push([chamfer_faces[pairs[0][0]][pairs[0][1]],
                        chamfer_faces[pairs[1][0]][pairs[1][1]],
                        chamfer_faces[pairs[3][0]][pairs[3][1]],
                        chamfer_faces[pairs[2][0]][pairs[2][1]], -1]);
            }
        }
        for (var i = 0; i < corner_faces.length; ++i) {
            var cf = corner_faces[i], face = [cf[0]], count = cf.length - 1;
            while (count) {
                for (var m = faces.length; m < chamfer_faces.length; ++m) {
                    var index = chamfer_faces[m].indexOf(face[face.length - 1]);
                    if (index >= 0 && index < 4) {
                        if (--index == -1) index = 3;
                        var next_vertex = chamfer_faces[m][index];
                        if (cf.indexOf(next_vertex) >= 0) {
                            face.push(next_vertex);
                            break;
                        }
                    }
                }
                --count;
            }
            face.push(-1);
            chamfer_faces.push(face);
        }
        return { vectors: chamfer_vectors, faces: chamfer_faces };
    }

    function create_geom(vertices, faces, radius, tab, af, chamfer) {
        var vectors = new Array(vertices.length);
        for (var i = 0; i < vertices.length; ++i) {
            vectors[i] = (new THREE.Vector3).fromArray(vertices[i]).normalize();
        }
        var cg = chamfer_geom(vectors, faces, chamfer);
        var geom = make_geom(cg.vectors, cg.faces, radius, tab, af);
        //var geom = make_geom(vectors, faces, radius, tab, af); // Without chamfer
        geom.cannon_shape = create_shape(vectors, faces, radius);
        return geom;
    }

    self.standard_d10_dice_face_labels = [' ', '✪', ' ', ' ', ' ', ' ', ' ', '●', '●', '●', '●'];
    self.hunger_d10_dice_face_labels = [' ', '✪', '⚠', ' ', ' ', ' ', ' ', '●', '●', '●', '●'];
    
    function calc_texture_size(approx) {
        return Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)));
    }

    self.create_dice_materials = function(face_labels, size, margin, isHunger = false, isRouse = false, isRemorse = false, isFrenzy = false) {
        function create_text_texture(text, color, back_color) {
            if (text == undefined) return null;
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");
            var ts = calc_texture_size(size + size * 2 * margin) * 2;
            canvas.width = canvas.height = ts;
            context.font = ts / (1 + 2 * margin) + "pt Arial";
            context.fillStyle = back_color;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = '#FFFFFF'; 
            
            // Make circle symbol larger
            if (text === '●') {
                context.font = (ts / (1 + 2 * margin) * 1.7) + "pt Arial";
            }
            
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            if (text == '6' || text == '9') {
                context.fillText('  .', canvas.width / 2, canvas.height / 2);
            }
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        }
        var materials = [];
        for (var i = 0; i < face_labels.length; ++i) {
            let fillColor;
            if (isHunger) {
                fillColor = self.hunger_dice_color;
            } else if (isRouse) {
                fillColor = self.rouse_dice_color;
            } else if (isRemorse) {
                fillColor = self.remorse_dice_color;
            } else if (isFrenzy) {
                fillColor = self.frenzy_dice_color;
            } else {
                fillColor = self.dice_color;
            }
            materials.push(new THREE.MeshPhongMaterial($t.copyto(self.material_options,
                        { map: create_text_texture(face_labels[i], self.label_color, fillColor) })));
        }
        return materials;
    }

    self.create_d10_geometry = function(radius) {
        var a = Math.PI * 2 / 10, k = Math.cos(a), h = 0.105, v = -1;
        var vertices = [];
        for (var i = 0, b = 0; i < 10; ++i, b += a)
            vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
        vertices.push([0, 0, -1]); vertices.push([0, 0, 1]);
        var faces = [[5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3], [7, 9, 11, 4],
                [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7], [3, 5, 11, 8], [6, 4, 10, 9],
                [1, 0, 2, v], [1, 2, 3, v], [3, 2, 4, v], [3, 4, 5, v], [5, 4, 6, v],
                [5, 6, 7, v], [7, 6, 8, v], [7, 8, 9, v], [9, 8, 0, v], [9, 0, 1, v]];
        return create_geom(vertices, faces, radius, 0, Math.PI * 6 / 5, 0.945);
    }

    self.material_options = {
        specular: 0x444444,
        color: 0xf0f0f0,
        shininess: 10,
        emissive: 0x111111,
        shading: THREE.FlatShading,
    };
    self.label_color = '#aaaaaa';
    self.dice_color = '#080206';  // Regular dice - Black
    self.hunger_dice_color = '#A41B2E';  // Hunger dice - Madder
    self.rouse_dice_color = '#331D43';  // Rouse dice - Dark Purple
    self.remorse_dice_color = '#19305B';  // Remorse dice - Delft Blue
    self.frenzy_dice_color = '#B83B1A';  // Frenzy dice - Rust
    self.ambient_light_color = 0x000000;
    self.rim_light_color = 0x666666;
    self.rim_light_intensity = 0.8;
    self.selector_back_colors = { color: 0x404040, shininess: 0, emissive: 0x858787 };
    self.desk_color = 0x000000;
    self.use_shadows = true;
    
    self.known_types = ['d10'];
    self.dice_face_range = { 'd10': [0, 9]};
    self.dice_mass = { 'd10': 5 };
    self.dice_inertia = { 'd10': 15 };

    self.scale = 50;

    self.create_d10 = function(isHunger = false, isRouse = false, isRemorse = false, isFrenzy = false) {
        if (!this.d10_geometry) this.d10_geometry = this.create_d10_geometry(this.scale * 0.9);
        if (!this.dice_material) this.dice_material = new THREE.MeshFaceMaterial(
          this.create_dice_materials(
            this.standard_d10_dice_face_labels,
            this.scale / 2,
            1.0,
            false,
          )
        );
        if (!this.hunger_dice_material) this.hunger_dice_material = new THREE.MeshFaceMaterial(
          this.create_dice_materials(
            this.hunger_d10_dice_face_labels,
            this.scale / 2,
            1.0,
            true,
          )
        );
        if (!this.rouse_dice_material) this.rouse_dice_material = new THREE.MeshFaceMaterial(
          this.create_dice_materials(
            this.standard_d10_dice_face_labels,
            this.scale / 2,
            1.0,
            false,
            true,
          )
        );
        if (!this.remorse_dice_material) this.remorse_dice_material = new THREE.MeshFaceMaterial(
          this.create_dice_materials(
            this.standard_d10_dice_face_labels,
            this.scale / 2,
            1.0,
            false,
            false,
            true,
          )
        );
        if (!this.frenzy_dice_material) this.frenzy_dice_material = new THREE.MeshFaceMaterial(
          this.create_dice_materials(
            this.standard_d10_dice_face_labels,
            this.scale / 2,
            1.0,
            false,
            false,
            false,
            true,
          )
        );
        if (isHunger) {
          return new THREE.Mesh(this.d10_geometry, this.hunger_dice_material);
        }
        if (isRouse) {
          return new THREE.Mesh(this.d10_geometry, this.rouse_dice_material);
        }
        if (isRemorse) {
          return new THREE.Mesh(this.d10_geometry, this.remorse_dice_material);
        }
        if (isFrenzy) {
          return new THREE.Mesh(this.d10_geometry, this.frenzy_dice_material);
        }
        return new THREE.Mesh(this.d10_geometry, this.dice_material);
    }

    self.parse_notation = function(regularCount, hungerCount, rouseCount = 0, remorseCount = 0, frenzyCount = 0) {
        // Basic validation without breaking functionality
        if (regularCount < 0) regularCount = 0;
        if (hungerCount < 0) hungerCount = 0;
        if (rouseCount < 0) rouseCount = 0;
        if (remorseCount < 0) remorseCount = 0;
        if (frenzyCount < 0) frenzyCount = 0;
        if (regularCount > 20) regularCount = 20;
        if (hungerCount > 5) hungerCount = 5;
        if (rouseCount > 3) rouseCount = 3; // Allow up to 3 rouse dice
        if (remorseCount > 10) remorseCount = 10;
        if (frenzyCount > 15) frenzyCount = 15;

        var ret = { 
            set: [], 
            hungerSet: [], 
            rouseSet: [],
            remorseSet: [],
            frenzySet: [],
            constant: 0, 
            result: [], 
            error: false 
        };

        // Ensure at least one die is being rolled
        if (regularCount === 0 && hungerCount === 0 && rouseCount === 0 && remorseCount === 0 && frenzyCount === 0) {
            ret.error = true;
            return ret;
        }

        var type = 'd10';
        for (var i = 0; i < regularCount; i++) { ret.set.push(type); }
        for (var i = 0; i < hungerCount; i++) { ret.hungerSet.push(type); }
        for (var i = 0; i < rouseCount; i++) { ret.rouseSet.push(type); }
        for (var i = 0; i < remorseCount; i++) { ret.remorseSet.push(type); }
        for (var i = 0; i < frenzyCount; i++) { ret.frenzySet.push(type); }
        return ret;
    }

    var that = self;

    self.dice_box = function(container, dimentions) {
        this.use_adapvite_timestep = true;
        this.animate_selector = true;

        this.dices = [];
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();

        this.renderer = window.WebGLRenderingContext
            ? new THREE.WebGLRenderer({ antialias: true })
            : new THREE.CanvasRenderer({ antialias: true });
        container.appendChild(this.renderer.domElement);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.setClearColor(0x000000, 1);

        this.reinit(container, dimentions);

        this.world.gravity.set(0, 0, -9.8 * 800);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 16;

        var ambientLight = new THREE.AmbientLight(that.ambient_light_color, 0.6);
        this.scene.add(ambientLight);

        // Remove spotlight and add rim lights
        const rimLight1 = new THREE.DirectionalLight(that.rim_light_color, that.rim_light_intensity);
        rimLight1.position.set(-1, 0, 1);  // Back left
        rimLight1.castShadow = that.use_shadows;
        if (that.use_shadows) {
            rimLight1.shadow.mapSize.width = 2048;
            rimLight1.shadow.mapSize.height = 2048;
            rimLight1.shadow.camera.near = 500;
            rimLight1.shadow.camera.far = 4000;
            rimLight1.shadow.bias = -0.0001;
            rimLight1.shadow.darkness = 0.8;
        }
        this.scene.add(rimLight1);

        const rimLight2 = new THREE.DirectionalLight(that.rim_light_color, that.rim_light_intensity);
        rimLight2.position.set(1, 0, 1);  // Back right
        rimLight2.castShadow = that.use_shadows;
        if (that.use_shadows) {
            rimLight2.shadow.mapSize.width = 2048;
            rimLight2.shadow.mapSize.height = 2048;
            rimLight2.shadow.camera.near = 500;
            rimLight2.shadow.camera.far = 4000;
            rimLight2.shadow.bias = -0.0001;
            rimLight2.shadow.darkness = 0.8;
        }
        this.scene.add(rimLight2);

        this.dice_body_material = new CANNON.Material();
        var desk_body_material = new CANNON.Material();
        var barrier_body_material = new CANNON.Material();
        this.world.addContactMaterial(new CANNON.ContactMaterial(
                    desk_body_material, this.dice_body_material, 0.01, 0.5));
        this.world.addContactMaterial(new CANNON.ContactMaterial(
                    barrier_body_material, this.dice_body_material, 0, 1.0));
        this.world.addContactMaterial(new CANNON.ContactMaterial(
                    this.dice_body_material, this.dice_body_material, 0, 0.5));

        this.world.add(new CANNON.RigidBody(0, new CANNON.Plane(), desk_body_material));
        var barrier;
        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrier_body_material);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        barrier.position.set(0, this.h * 0.93, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrier_body_material);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        barrier.position.set(0, -this.h * 0.93, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrier_body_material);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
        barrier.position.set(this.w * 0.93, 0, 0);
        this.world.add(barrier);

        barrier = new CANNON.RigidBody(0, new CANNON.Plane(), barrier_body_material);
        barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        barrier.position.set(-this.w * 0.93, 0, 0);
        this.world.add(barrier);

        this.last_time = 0;
        this.running = false;

        this.renderer.render(this.scene, this.camera);
    }

    self.dice_box.prototype.reinit = function(container, dimentions) {
        this.cw = container.clientWidth / 2;
        this.ch = container.clientHeight / 2;
        if (dimentions) {
            this.w = dimentions.w;
            this.h = dimentions.h;
        }
        else {
            this.w = this.cw;
            this.h = this.ch;
        }
        this.aspect = Math.min(this.cw / this.w, this.ch / this.h);
        that.scale = Math.sqrt(this.w * this.w + this.h * this.h) / 13;

        this.renderer.setSize(this.cw * 2, this.ch * 2);

        this.wh = this.ch / this.aspect / Math.tan(10 * Math.PI / 180);
        if (this.camera) this.scene.remove(this.camera);
        this.camera = new THREE.PerspectiveCamera(20, this.cw / this.ch, 1, this.wh * 1.3);
        this.camera.position.z = this.wh;

        var mw = Math.max(this.w, this.h);
        if (this.light) this.scene.remove(this.light);
        this.light = new THREE.DirectionalLight(that.rim_light_color, that.rim_light_intensity);
        this.light.position.set(-mw/2, mw/2, mw);
        this.light.target.position.set(0, 0, 0);
        this.light.castShadow = true;
        this.light.shadowCameraNear = mw / 10;
        this.light.shadowCameraFar = mw * 5;
        this.light.shadowCameraFov = 50;
        this.light.shadowBias = -0.0001;
        this.light.shadowDarkness = 0.8;
        this.light.shadowMapWidth = 2048;
        this.light.shadowMapHeight = 2048;
        this.scene.add(this.light);

        if (this.desk) this.scene.remove(this.desk);
        this.desk = new THREE.Mesh(new THREE.PlaneGeometry(this.w * 2, this.h * 2, 1, 1),
                new THREE.MeshPhongMaterial({ color: that.desk_color }));
        this.desk.receiveShadow = that.use_shadows;
        this.scene.add(this.desk);

        this.renderer.render(this.scene, this.camera);
    }

    self.dice_box.prototype.init = function() {
        this.running = true;
        this.iteration = 0;
        this.__animate();
    }

    function make_random_vector(vector) {
        var random_angle = rnd() * Math.PI / 5 - Math.PI / 5 / 2;
        var vec = {
            x: vector.x * Math.cos(random_angle) - vector.y * Math.sin(random_angle),
            y: vector.x * Math.sin(random_angle) + vector.y * Math.cos(random_angle)
        };
        if (vec.x == 0) vec.x = 0.01;
        if (vec.y == 0) vec.y = 0.01;
        return vec;
    }

    self.dice_box.prototype.generate_vectors = function(notation, vector, boost) {
        var vectors = [];
        for (var i in notation.set) {
            var vec = make_random_vector(vector);
            var pos = {
                x: this.w * (vec.x > 0 ? -1 : 1) * 0.9,
                y: this.h * (vec.y > 0 ? -1 : 1) * 0.9,
                z: rnd() * 200 + 200
            };
            var projector = Math.abs(vec.x / vec.y);
            if (projector > 1.0) pos.y /= projector; else pos.x *= projector;
            var velvec = make_random_vector(vector);
            var velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
            var inertia = that.dice_inertia[notation.set[i]];
            var angle = {
                x: -(rnd() * vec.y * 5 + inertia * vec.y),
                y: rnd() * vec.x * 5 + inertia * vec.x,
                z: 0
            };
            var axis = { x: rnd(), y: rnd(), z: rnd(), a: rnd() };
            vectors.push({
              set: notation.set[i],
              pos: pos,
              velocity: velocity,
              angle: angle,
              axis: axis,
              isHunger: false,
              isRouse: false,
              isRemorse: false,
              isFrenzy: false
            });
        }
        for (var i in notation.hungerSet) {
            var vec = make_random_vector(vector);
            var pos = {
                x: this.w * (vec.x > 0 ? -1 : 1) * 0.9,
                y: this.h * (vec.y > 0 ? -1 : 1) * 0.9,
                z: rnd() * 200 + 200
            };
            var projector = Math.abs(vec.x / vec.y);
            if (projector > 1.0) pos.y /= projector; else pos.x *= projector;
            var velvec = make_random_vector(vector);
            var velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
            var inertia = that.dice_inertia[notation.hungerSet[i]];
            var angle = {
                x: -(rnd() * vec.y * 5 + inertia * vec.y),
                y: rnd() * vec.x * 5 + inertia * vec.x,
                z: 0
            };
            var axis = { x: rnd(), y: rnd(), z: rnd(), a: rnd() };
            vectors.push({
              set: notation.hungerSet[i],
              pos: pos,
              velocity: velocity,
              angle: angle,
              axis: axis,
              isHunger: true,
              isRouse: false,
              isRemorse: false,
              isFrenzy: false
            });
        }
        for (var i in notation.rouseSet) {
            var vec = make_random_vector(vector);
            var pos = {
                x: this.w * (vec.x > 0 ? -1 : 1) * 0.9,
                y: this.h * (vec.y > 0 ? -1 : 1) * 0.9,
                z: rnd() * 200 + 200
            };
            var projector = Math.abs(vec.x / vec.y);
            if (projector > 1.0) pos.y /= projector; else pos.x *= projector;
            var velvec = make_random_vector(vector);
            var velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
            var inertia = that.dice_inertia[notation.rouseSet[i]];
            var angle = {
                x: -(rnd() * vec.y * 5 + inertia * vec.y),
                y: rnd() * vec.x * 5 + inertia * vec.x,
                z: 0
            };
            var axis = { x: rnd(), y: rnd(), z: rnd(), a: rnd() };
            vectors.push({
              set: notation.rouseSet[i],
              pos: pos,
              velocity: velocity,
              angle: angle,
              axis: axis,
              isHunger: false,
              isRouse: true,
              isRemorse: false,
              isFrenzy: false
            });
        }
        for (var i in notation.remorseSet) {
            var vec = make_random_vector(vector);
            var pos = {
                x: this.w * (vec.x > 0 ? -1 : 1) * 0.9,
                y: this.h * (vec.y > 0 ? -1 : 1) * 0.9,
                z: rnd() * 200 + 200
            };
            var projector = Math.abs(vec.x / vec.y);
            if (projector > 1.0) pos.y /= projector; else pos.x *= projector;
            var velvec = make_random_vector(vector);
            var velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
            var inertia = that.dice_inertia[notation.remorseSet[i]];
            var angle = {
                x: -(rnd() * vec.y * 5 + inertia * vec.y),
                y: rnd() * vec.x * 5 + inertia * vec.x,
                z: 0
            };
            var axis = { x: rnd(), y: rnd(), z: rnd(), a: rnd() };
            vectors.push({
              set: notation.remorseSet[i],
              pos: pos,
              velocity: velocity,
              angle: angle,
              axis: axis,
              isHunger: false,
              isRouse: false,
              isRemorse: true,
              isFrenzy: false
            });
        }
        for (var i in notation.frenzySet) {
            var vec = make_random_vector(vector);
            var pos = {
                x: this.w * (vec.x > 0 ? -1 : 1) * 0.9,
                y: this.h * (vec.y > 0 ? -1 : 1) * 0.9,
                z: rnd() * 200 + 200
            };
            var projector = Math.abs(vec.x / vec.y);
            if (projector > 1.0) pos.y /= projector; else pos.x *= projector;
            var velvec = make_random_vector(vector);
            var velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
            var inertia = that.dice_inertia[notation.frenzySet[i]];
            var angle = {
                x: -(rnd() * vec.y * 5 + inertia * vec.y),
                y: rnd() * vec.x * 5 + inertia * vec.x,
                z: 0
            };
            var axis = { x: rnd(), y: rnd(), z: rnd(), a: rnd() };
            vectors.push({
              set: notation.frenzySet[i],
              pos: pos,
              velocity: velocity,
              angle: angle,
              axis: axis,
              isHunger: false,
              isRouse: false,
              isRemorse: false,
              isFrenzy: true
            });
        }
        return vectors;
    }

    self.dice_box.prototype.create_dice = function(type, pos, velocity, angle, axis, isHunger = false, isRouse = false, isRemorse = false, isFrenzy = false) {
        var dice = that['create_' + type](isHunger, isRouse, isRemorse, isFrenzy);
        dice.castShadow = true;
        dice.dice_type = type;
        dice.body = new CANNON.RigidBody(that.dice_mass[type],
                dice.geometry.cannon_shape, this.dice_body_material);
        dice.body.position.set(pos.x, pos.y, pos.z);
        dice.body.quaternion.setFromAxisAngle(new CANNON.Vec3(axis.x, axis.y, axis.z), axis.a * Math.PI * 2);
        dice.body.angularVelocity.set(angle.x, angle.y, angle.z);
        dice.body.velocity.set(velocity.x, velocity.y, velocity.z);
        dice.body.linearDamping = 0.1;
        dice.body.angularDamping = 0.1;
        this.scene.add(dice);
        this.dices.push(dice);
        this.world.add(dice.body);
    }

    self.dice_box.prototype.check_if_throw_finished = function() {
        var res = true;
        var e = 6;
        if (this.iteration < 10 / that.frame_rate) {
            for (var i = 0; i < this.dices.length; ++i) {
                var dice = this.dices[i];
                if (dice.dice_stopped === true) continue;
                var a = dice.body.angularVelocity, v = dice.body.velocity;
                if (Math.abs(a.x) < e && Math.abs(a.y) < e && Math.abs(a.z) < e &&
                        Math.abs(v.x) < e && Math.abs(v.y) < e && Math.abs(v.z) < e) {
                    if (dice.dice_stopped) {
                        if (this.iteration - dice.dice_stopped > 3) {
                            dice.dice_stopped = true;
                            continue;
                        }
                    }
                    else dice.dice_stopped = this.iteration;
                    res = false;
                }
                else {
                    dice.dice_stopped = undefined;
                    res = false;
                }
            }
        }
        return res;
    }

    function get_dice_value(dice) {
        var vector = new THREE.Vector3(0, 0, 1);
        var closest_face, closest_angle = Math.PI * 2;
        for (var i = 0, l = dice.geometry.faces.length; i < l; ++i) {
            var face = dice.geometry.faces[i];
            if (face.materialIndex == 0) continue;
            var angle = face.normal.clone().applyQuaternion(dice.body.quaternion).angleTo(vector);
            if (angle < closest_angle) {
                closest_angle = angle;
                closest_face = face;
            }
        }
        var matindex = closest_face.materialIndex - 1;
        return matindex;
    }

    function get_dice_values(dices) {
        var values = [];
        for (var i = 0, l = dices.length; i < l; ++i) {
            values.push(get_dice_value(dices[i]));
        }
        return values;
    }

    self.dice_box.prototype.emulate_throw = function() {
        while (!this.check_if_throw_finished()) {
            ++this.iteration;
            this.world.step(that.frame_rate);
        }
        return get_dice_values(this.dices);
    }

    self.dice_box.prototype.__animate = function(threadid) {
        var time = (new Date()).getTime();
        var time_diff = (time - this.last_time) / 1000;
        if (time_diff > 3) time_diff = that.frame_rate;
        ++this.iteration;
        if (this.use_adapvite_timestep) {
            while (time_diff > that.frame_rate * 1.1) {
                this.world.step(that.frame_rate);
                time_diff -= that.frame_rate;
            }
            this.world.step(time_diff);
        }
        else {
            this.world.step(that.frame_rate);
        }
        for (var i in this.scene.children) {
            var interact = this.scene.children[i];
            if (interact.body != undefined) {
                interact.position.copy(interact.body.position);
                interact.quaternion.copy(interact.body.quaternion);
            }
        }
        this.renderer.render(this.scene, this.camera);
        this.last_time = this.last_time ? time : (new Date()).getTime();
        if (this.running == threadid && this.check_if_throw_finished()) {
            this.running = false;
            if (this.callback) this.callback.call(this, get_dice_values(this.dices));
        }
        if (this.running == threadid) {
            (function(t, tid, uat) {
                if (!uat && time_diff < that.frame_rate) {
                    setTimeout(function() { requestAnimationFrame(function() { t.__animate(tid); }); },
                        (that.frame_rate - time_diff) * 1000);
                }
                else requestAnimationFrame(function() { t.__animate(tid); });
            })(this, threadid, this.use_adapvite_timestep);
        }
    }

    self.dice_box.prototype.clear = function() {
        this.running = false;
        var dice;
        while (dice = this.dices.pop()) {
            this.scene.remove(dice);
            if (dice.body) this.world.remove(dice.body);
        }
        if (this.pane) this.scene.remove(this.pane);
        this.renderer.render(this.scene, this.camera);
        var box = this;
        setTimeout(function() { box.renderer.render(box.scene, box.camera); }, 100);
    }

    self.dice_box.prototype.prepare_dices_for_roll = function(vectors) {
        this.clear();
        this.iteration = 0;
        for (var i in vectors) {
            this.create_dice(vectors[i].set, vectors[i].pos, vectors[i].velocity,
                    vectors[i].angle, vectors[i].axis, vectors[i].isHunger, vectors[i].isRouse, vectors[i].isRemorse, vectors[i].isFrenzy);
        }
    }

    function shift_dice_faces(dice, value, res) {
        var r = that.dice_face_range[dice.dice_type];
        if (dice.dice_type == 'd10' && value == 10) value = 0;
        if (dice.dice_type == 'd10' && res == 10) res = 0;
        if (!(value >= r[0] && value <= r[1])) return;
        var num = value - res;
        var geom = dice.geometry.clone();
        for (var i = 0, l = geom.faces.length; i < l; ++i) {
            var matindex = geom.faces[i].materialIndex;
            if (matindex == 0) continue;
            matindex += num - 1;
            while (matindex > r[1]) matindex -= r[1];
            while (matindex < r[0]) matindex += r[1];
            geom.faces[i].materialIndex = matindex + 1;
        }
        dice.geometry = geom;
    }

    self.dice_box.prototype.roll = function(vectors, values, callback) {
        this.prepare_dices_for_roll(vectors);
        if (values != undefined && values.length) {
            this.use_adapvite_timestep = false;
            var res = this.emulate_throw();
            this.prepare_dices_for_roll(vectors);
            for (var i in res)
                shift_dice_faces(this.dices[i], values[i], res[i]);
        }
        this.callback = callback;
        this.running = (new Date()).getTime();
        this.last_time = 0;
        this.__animate(this.running);
    }

    self.dice_box.prototype.__selector_animate = function(threadid) {
        var time = (new Date()).getTime();
        var time_diff = (time - this.last_time) / 1000;
        if (time_diff > 3) time_diff = that.frame_rate;
        var angle_change = 0.3 * time_diff * Math.PI * Math.min(24000 + threadid - time, 6000) / 6000;
        if (angle_change < 0) this.running = false;
        for (var i in this.dices) {
            this.dices[i].rotation.y += angle_change;
            this.dices[i].rotation.x += angle_change / 4;
            this.dices[i].rotation.z += angle_change / 10;
        }
        this.last_time = time;
        this.renderer.render(this.scene, this.camera);
        if (this.running == threadid) {
            (function(t, tid) {
                requestAnimationFrame(function() { t.__selector_animate(tid); });
            })(this, threadid);
        }
    }

    self.dice_box.prototype.search_dice_by_mouse = function(ev) {
        var m = $t.get_mouse_coords(ev);
        var intersects = (new THREE.Raycaster(this.camera.position,
                    (new THREE.Vector3((m.x - this.cw) / this.aspect,
                                       1 - (m.y - this.ch) / this.aspect, this.w / 9))
                    .sub(this.camera.position).normalize())).intersectObjects(this.dices);
        if (intersects.length) return intersects[0].object.userData;
    }

    self.dice_box.prototype.draw_selector = function() {
        this.clear();
        var step = this.w / 4.5;
        this.pane = new THREE.Mesh(new THREE.PlaneGeometry(this.w * 6, this.h * 6, 1, 1),
                new THREE.MeshPhongMaterial(that.selector_back_colors));
        this.pane.receiveShadow = true;
        this.pane.position.set(0, 0, 1);
        this.scene.add(this.pane);

        var mouse_captured = false;

        for (var i = 0, pos = -3; i < that.known_types.length; ++i, ++pos) {
            var dice = $t.dice['create_' + that.known_types[i]]();
            dice.position.set(pos * step, 0, step * 0.5);
            dice.castShadow = true;
            dice.userData = that.known_types[i];
            this.dices.push(dice); this.scene.add(dice);
        }

        this.running = (new Date()).getTime();
        this.last_time = 0;
        if (this.animate_selector) this.__selector_animate(this.running);
        else this.renderer.render(this.scene, this.camera);
    }

    function throw_dices(box, vector, boost, dist, notation_getter, before_roll, after_roll) {
        var uat = $t.dice.use_adapvite_timestep;
        function roll(request_results) {
            if (after_roll) {
                box.clear();
                box.roll(vectors, request_results || notation.result, function(result) {
                    if (typeof after_roll === 'function') {
                        after_roll.call(box, notation, result);
                    }
                    box.rolling = false;
                    $t.dice.use_adapvite_timestep = uat;
                });
            } else {
                box.clear();
                box.roll(vectors, request_results || notation.result, function(result) {
                    box.rolling = false;
                    $t.dice.use_adapvite_timestep = uat;
                });
            }
        }
        vector.x /= dist; vector.y /= dist;
        var notation = notation_getter.call(box);
        // Check if any dice are present
        if (notation.set.length == 0 && notation.hungerSet.length == 0 && 
            notation.rouseSet.length == 0 && notation.remorseSet.length == 0 && 
            notation.frenzySet.length == 0) return;
        var vectors = box.generate_vectors(notation, vector, boost);
        box.rolling = true;
        if (typeof before_roll === 'function') {
            before_roll.call(box, vectors, notation, roll);
        } else {
            roll();
        }
    }

    self.dice_box.prototype.bind_mouse = function(container, notation_getter, before_roll, after_roll) {
        var box = this;
        $t.bind(container, ['mousedown', 'touchstart'], function(ev) {
            if (box.rolling && ev.target.closest('#canvas')) {
                ev.preventDefault();
                return;
            }
            box.mouse_time = (new Date()).getTime();
            box.mouse_start = $t.get_mouse_coords(ev);
        });
        $t.bind(container, ['mouseup', 'touchend'], function(ev) {
            if (box.rolling && ev.target.closest('#canvas')) {
                ev.stopPropagation();
                return;
            }
            if (!box.mouse_start) return;
            ev.stopPropagation();
            var m = $t.get_mouse_coords(ev);
            var vector = { x: m.x - box.mouse_start.x, y: -(m.y - box.mouse_start.y) };
            box.mouse_start = undefined;
            var dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
            if (dist < Math.sqrt(box.w * box.h * 0.01)) return;
            var time_int = (new Date()).getTime() - box.mouse_time;
            if (time_int > 2000) time_int = 2000;
            var boost = Math.sqrt((2500 - time_int) / 2500) * dist * 2;
            prepare_rnd(function() {
                if (typeof notation_getter === 'function') {
                    throw_dices(box, vector, boost, dist, notation_getter, before_roll, after_roll);
                }
            });
        });
    }

    self.dice_box.prototype.bind_throw = function(button, notation_getter, before_roll, after_roll) {
        var box = this;
        $t.bind(button, ['mouseup', 'touchend'], function(ev) {
            if (box.rolling) return;
            ev.stopPropagation();
            box.start_throw(notation_getter, before_roll, after_roll);
        });
    }

    self.dice_box.prototype.start_throw = function(notation_getter, before_roll, after_roll) {
        var box = this;
        if (box.rolling) return;
        prepare_rnd(function() {
            if (typeof notation_getter === 'function') {
                var vector = { x: (rnd() * 2 - 1) * box.w, y: -(rnd() * 2 - 1) * box.h };
                var dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
                var boost = (rnd() + 3) * dist;
                throw_dices(box, vector, boost, dist, notation_getter, before_roll, after_roll);
            }
        });
    }

}).apply(teal.dice = teal.dice || {});
