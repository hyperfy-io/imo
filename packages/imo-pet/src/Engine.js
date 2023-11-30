import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { N8AOPostPass } from "n8ao";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  SelectiveBloomEffect,
} from "postprocessing";
import { GLTFMeshGpuInstancingExtension } from "./three/EXT_mesh_gpu_instancing";
import EventEmitter from "eventemitter3";

import { GLB } from "./GLB";
import { IMOPet } from "./IMOPet";

const FOV = 70;

export class Engine extends EventEmitter {
  constructor(viewport) {
    super();
    this.init(viewport);
  }

  async init(viewport) {
    window.engine = this;
    window.THREE = THREE;

    this.imo = null;
    this.viewport = viewport;

    // Renderer
    this.renderer = getRenderer();
    this.renderer.setClearColor(0xffffff, 0);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.useLegacyLights = false;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    // this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
    this.canvas = this.renderer.domElement;
    this.viewport.appendChild(this.canvas);
    this.size = {};
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 123, 0.01, 2000);

    // Sun
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.position.set(200, 400, 200);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 1000;
    this.sun.shadow.mapSize.set(2048, 2048);
    // this.sun.shadow.bias = 0.00005
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Temp Model
    // const box = new THREE.Mesh(
    //   new THREE.BoxGeometry(1, 1, 1),
    //   new THREE.MeshStandardMaterial({ color: 'red' })
    // )
    // this.scene.add(box)

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0.5, 0);
    this.camera.position.set(-1.7, 1, -2);
    this.controls.update();

    // Postprocessing
    const context = this.renderer.getContext();
    const maxMultisampling = context.getParameter(context.MAX_SAMPLES);
    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: Math.min(8, maxMultisampling),
    });
    // Render Pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    // AO Pass
    this.aoPass = new N8AOPostPass(
      this.scene,
      this.camera,
      this.size.width,
      this.size.height
    );
    this.aoPass.configuration.aoRadius = 0.5;
    this.aoPass.configuration.distanceFalloff = 0.1; // 1/5 radius
    this.aoPass.configuration.intensity = 3; // default 5 is very grainy
    this.aoPass.configuration.screenSpaceRadius = false;
    this.composer.addPass(this.aoPass);
    // Bloom Pass
    this.bloom = new SelectiveBloomEffect(this.scene, this.camera, {
      mipmapBlur: true,
      luminanceThreshold: 1.0,
      intensity: 0.2,
      radius: 0.3,
    });
    this.bloom.inverted = true;
    this.bloomPass = new EffectPass(this.camera, this.bloom);
    this.composer.addPass(this.bloomPass);
    // SMAA Pass
    // this.smaa = new SMAAEffect({
    //   // preset: SMAAPreset.ULTRA, // default MEDIUM
    //   // edgeDetectionMode: EdgeDetectionMode.DEPTH, // default COLOR
    //   // predicationMode: PredicationMode.DEPTH, // default DISABlED
    // })
    // this.smaaPass = new EffectPass(this.camera, this.smaa)
    // this.composer.addPass(this.smaaPass)
    // this.smaaPass.renderToScreen = true

    // PP toggles
    this.aoPass.enabled = true;
    this.bloomPass.enabled = true;
    const ao = this.aoPass.enabled;
    const bloom = this.bloomPass.enabled;
    this.renderPass.renderToScreen = !ao && !bloom;
    this.aoPass.renderToScreen = ao && !bloom;
    // this.aoPass.configuration.halfRes = false
    this.bloomPass.renderToScreen = bloom;

    // Loaders
    this.rgbe = new RGBELoader();
    this.gltf = new GLTFLoader();
    this.gltf.setMeshoptDecoder(MeshoptDecoder);
    const basisu = new KTX2Loader();
    basisu.setTranscoderPath("/basis");
    // we copied over three/examples/jsm/libs/basis/* to /public/basis
    // basisu.setTranscoderPath('js/libs/basis/')
    basisu.detectSupport(this.renderer);
    this.gltf.setKTX2Loader(basisu);
    // we copied over three/examples/jsm/libs/draco to /public/draco
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/gltf/");
    this.gltf.setDRACOLoader(dracoLoader);
    this.gltf.register((parser) => new GLTFMeshGpuInstancingExtension(parser));

    // HDRI
    const texture = await this.rgbe.loadAsync("/sky.hdr");
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = texture;

    // Start
    this.onResize();
    this.renderer.setAnimationLoop(this.update);
    window.addEventListener("resize", this.onResize);
  }

  load = async (file) => {
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }
    this.file = file;
    this.fileUrl = URL.createObjectURL(file);
    const gltf = await this.gltf.loadAsync(this.fileUrl);
    this.model = gltf.scene;
    this.scene.add(this.model);
    this.adjustCamera();

    const clips = gltf.animations || [];
    this.animations = [];
    if (clips.length) {
      for (const clip of clips) {
        this.animations.push({
          label: clip.name,
          value: clip.name,
        });
      }
    }

    const glb = new GLB();
    await glb.fromFile(file);
    this.imo = new IMOPet().fromGlb(glb);
    // await this.imp.read(file)

    this.emit("loaded");
  };

  adjustCamera() {
    const sphere = new THREE.Box3()
      .setFromObject(this.model)
      .getBoundingSphere(new THREE.Sphere());

    this.controls.target.copy(sphere.center);

    const dolly = new THREE.Object3D();
    const cam = new THREE.Object3D();
    const offset = 1;
    dolly.add(cam);
    cam.position.z = sphere.radius + offset;
    dolly.rotation.set(-22, -135, 0, "YXZ");
    dolly.rotation.x *= THREE.MathUtils.DEG2RAD;
    dolly.rotation.y *= THREE.MathUtils.DEG2RAD;
    dolly.rotation.z *= THREE.MathUtils.DEG2RAD;
    cam.getWorldPosition(this.camera.position);

    // this.camera.position.set(0, 0, sphere.radius + 1)

    // bbox.setFromObject(this.model)
    // const center = bbox.getCenter(new THREE.Vector3())
    // const size = bbox.getSize(new THREE.Vector3())

    // // const height = bbox.max.y - bbox.min.y
    // // this.controls.target.set(0, height / 2, 0)

    // // get the max side of the bounding box (fits to width OR height as needed )
    // const maxDim = Math.max(size.x, size.y, size.z)
    // const fov = this.camera.fov * (Math.PI / 180)
    // let cameraZ = Math.abs((maxDim / 4) * Math.tan(fov * 2))

    // cameraZ *= offset // zoom out a little so that objects don't fill the screen

    // this.camera.position.z = cameraZ
    // this.camera.position.set(0, 0, cameraZ)
    // this.camera.rotation.set(0, 0, 0)
  }

  onResize = () => {
    this.resize(this.viewport.offsetWidth, this.viewport.offsetHeight);
  };

  resize(width, height) {
    this.size.width = width;
    this.size.height = height;
    this.size.aspect = width / height;
    this.camera.aspect = this.size.aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.size.width, this.size.height);
    this.composer.setSize(this.size.width, this.size.height);
  }

  update = (time) => {
    const delta = (this.lastTime ? time - this.lastTime : 0) / 1000;
    this.lastTime = time;
    this.controls.update();
    this.render();
  };

  render() {
    this.composer.render();
    // this.renderer.render(this.scene, this.camera)
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.onResize);
  }
}

// utility to re-use the same renderer
let renderer = null;
function getRenderer(canvas) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      alpha: true,
    });
  }
  return renderer;
}
