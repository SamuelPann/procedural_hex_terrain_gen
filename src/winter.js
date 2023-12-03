import { 
  WebGLRenderer, ACESFilmicToneMapping, sRGBEncoding, 
  Color, CylinderGeometry, 
  RepeatWrapping, DoubleSide, BoxGeometry, Mesh, PointLight, MeshPhysicalMaterial, 
  PerspectiveCamera, Scene, PMREMGenerator, PCFSoftShadowMap,
  Vector2, TextureLoader, SphereGeometry, MeshStandardMaterial, Vector3
} from 'https://cdn.skypack.dev/three@0.137';
import { OrbitControls } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/controls/OrbitControls';
import { RGBELoader } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader';
import { mergeBufferGeometries } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/utils/BufferGeometryUtils';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@3.0.0';

import { GUI } from './more_assets/lil-gui.module.min.js';

export function setupWinterScene() {
  // Reset geometry variables to initial state
  let stoneGeo = new BoxGeometry(0, 0, 0);
  let dirtGeo = new BoxGeometry(0, 0, 0);
  let dirt2Geo = new BoxGeometry(0, 0, 0);
  let sandGeo = new BoxGeometry(0, 0, 0);
  let grassGeo = new BoxGeometry(0, 0, 0);

  const scene = new Scene();
  scene.background = new Color("#FFCB8E");

  const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(-17,31,33);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputEncoding = sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const light = new PointLight( new Color("#FFCB8E").convertSRGBToLinear().convertSRGBToLinear(), 80, 200 );
  light.castShadow = true; 
  light.shadow.mapSize.width = 512; 
  light.shadow.mapSize.height = 512; 
  light.shadow.camera.near = 0.5; 
  light.shadow.camera.far = 500; 
  scene.add( light );

  let gui = new GUI();
  const guiParams = {
    pauseLight: false,
    lightSpeed: 0.005,
    lightRadius: 30,
    waterSpeed: 0.001,
    pauseWater: false,
    pauseClouds: false,
  };

  gui.add(guiParams, 'pauseLight').name('Pause Sun Rotation');
  gui.add(guiParams, 'pauseWater').name('Pause Water Flow');
  gui.add(guiParams, 'pauseClouds').name('Pause Cloud Movement');
  gui.add(guiParams, 'lightSpeed', 0.001, 0.05).name('Sun Rotation Speed');
  gui.add(guiParams, 'lightRadius', 5, 100).name('Distance of Sun');
  gui.add(guiParams, 'waterSpeed', 0.0001, 0.01).name('Water Flow Speed');

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0,0,0);
  controls.dampingFactor = 0.05;
  controls.enableDamping = true;

  let pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  let envmap;
  const MAX_HEIGHT = 10;

  (async function() {
    // loads the environment map
    let envmapTexture = await new RGBELoader().loadAsync("assets/envmap_1.hdr");
    let rt = pmrem.fromEquirectangular(envmapTexture);
    envmap = rt.texture;

    // loads all the textures
    let textures = {
      dirt: await new TextureLoader().loadAsync("assets/dirt.png"),
      dirt2: await new TextureLoader().loadAsync("assets/dirt2.jpg"),
      grass: await new TextureLoader().loadAsync("assets/snow.jpg"),
      sand: await new TextureLoader().loadAsync("assets/more_snow.jpg"),
      water: await new TextureLoader().loadAsync("assets/water.jpg"),
      stone: await new TextureLoader().loadAsync("assets/stone.png"),
    };

    const simplex = new SimplexNoise(); // optional seed as a string parameter

    // loads all the tiles into the scene
    for(let i = -20; i <= 20; i++) {
      for(let j = -20; j <= 20; j++) {
        let position = tileToPosition(i, j);

        if(position.length() > 16) continue;
        
        let noise = (simplex.noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
        noise = Math.pow(noise, 1.5);

        hex(noise * MAX_HEIGHT, position, envmap);
      } 
    }

    let stoneMesh = hexMesh(stoneGeo, textures.stone);
    let grassMesh = hexMesh(grassGeo, textures.grass);
    let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
    let dirtMesh  = hexMesh(dirtGeo, textures.dirt);
    let sandMesh  = hexMesh(sandGeo, textures.sand);
    scene.add(stoneMesh, dirtMesh, dirt2Mesh, sandMesh, grassMesh);

    let waterTexture = textures.water;
    waterTexture.wrapS = RepeatWrapping;
    waterTexture.wrapT = RepeatWrapping;

    let seaMesh = new Mesh(
      new CylinderGeometry(17, 17, MAX_HEIGHT * 0.2, 50),
      new MeshPhysicalMaterial({
        envMap: envmap,
        color: new Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
        ior: 1.4,
        transmission: 1,
        transparent: true,
        thickness: 1.5,
        envMapIntensity: 0.2, 
        roughness: 1,
        metalness: 0.025,
        roughnessMap: waterTexture,
        metalnessMap: waterTexture,
      })
    );
    seaMesh.receiveShadow = true;
    seaMesh.rotation.y = -Math.PI * 0.333 * 0.5;
    seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0);
    scene.add(seaMesh);

    let mapContainer = new Mesh(
      new CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.25, 50, 1, true),
      new MeshPhysicalMaterial({
        envMap: envmap,
        map: textures.dirt,
        envMapIntensity: 0.2, 
        side: DoubleSide,
      })
    );
    mapContainer.receiveShadow = true;
    mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
    mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
    scene.add(mapContainer);

    let mapFloor = new Mesh(
      new CylinderGeometry(18.5, 18.5, MAX_HEIGHT * 0.1, 50),
      new MeshPhysicalMaterial({
        envMap: envmap,
        map: textures.dirt2,
        envMapIntensity: 0.1, 
        side: DoubleSide,
      })
    );
    mapFloor.receiveShadow = true;
    mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
    scene.add(mapFloor);

    let cloudMeshes = [];
    clouds(cloudMeshes);

    let frameCount = 0;

    renderer.setAnimationLoop(() => {
      controls.update();

      // check if the light should be paused
      if (!guiParams.pauseLight) {
        // Update the light position based on the frame count or time
        const angle = (frameCount * guiParams.lightSpeed) % (Math.PI * 2);
        const radius = guiParams.lightRadius;
        light.position.set(radius * Math.cos(angle), 20, radius * Math.sin(angle));

        frameCount++;
      }

      // check if the water should be paused
      if (!guiParams.pauseWater) {
        // Animate water texture
        waterTexture.offset.x -= guiParams.waterSpeed; // Adjust the speed of water animation
        seaMesh.material.roughnessMap.offset.x = waterTexture.offset.x;
        seaMesh.material.metalnessMap.offset.x = waterTexture.offset.x;
      }

      // check if clouds should be paused
      if (!guiParams.pauseClouds) {
        // Rotate clouds in the scene
        cloudMeshes.forEach((cloudMesh, index) => {
          const rotationSpeed = 0.001;
          cloudMesh.rotation.y += rotationSpeed * (index % 2 === 0 ? 1 : -1);
        });
      }
      
      renderer.render(scene, camera);
    });
  })();

  // ensure tiles line up correctly in hex
  function tileToPosition(tileX, tileY) {
    return new Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
  }

  function hexGeometry(height, position) {
    let geo  = new CylinderGeometry(1, 1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);

    return geo;
  }

  const STONE_HEIGHT = MAX_HEIGHT * 0.8;
  const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
  const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
  const SAND_HEIGHT = MAX_HEIGHT * 0.3;
  const DIRT2_HEIGHT = MAX_HEIGHT * 0;

  stoneGeo = new BoxGeometry(0,0,0);
  dirtGeo = new BoxGeometry(0,0,0);
  dirt2Geo = new BoxGeometry(0,0,0);
  sandGeo = new BoxGeometry(0,0,0);
  grassGeo = new BoxGeometry(0,0,0);

  function hex(height, position) {
    let geo = hexGeometry(height, position);

    if(height > STONE_HEIGHT) {
      stoneGeo = mergeBufferGeometries([geo, stoneGeo]);

      if(Math.random() > 0.8) {
        stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
      }
    } else if(height > DIRT_HEIGHT) {
      dirtGeo = mergeBufferGeometries([geo, dirtGeo]);

      if(Math.random() > 0.5) {
        grassGeo = mergeBufferGeometries([grassGeo, tree(height, position)]);
      }
    } else if(height > GRASS_HEIGHT) {
      grassGeo = mergeBufferGeometries([geo, grassGeo]);
    } else if(height > SAND_HEIGHT) { 
      sandGeo = mergeBufferGeometries([geo, sandGeo]);

      if(Math.random() > 0.8 && stoneGeo) {
        stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
      }
    } else if(height > DIRT2_HEIGHT) {
      dirt2Geo = mergeBufferGeometries([geo, dirt2Geo]);
    } 
  }

  function hexMesh(geo, map) {
    let mat = new MeshPhysicalMaterial({ 
      envMap: envmap, 
      envMapIntensity: 0.135, 
      flatShading: true,
      map
    });

    let mesh = new Mesh(geo, mat);
    mesh.castShadow = true; //default is false
    mesh.receiveShadow = true; //default

    return mesh;
  }

  function tree(height, position) {
    const treeHeight = Math.random() * 1 + 1.25;

    const geo = new CylinderGeometry(0, 1.5, treeHeight, 3);
    geo.translate(position.x, height + treeHeight * 0 + 1, position.y);
    
    const geo2 = new CylinderGeometry(0, 1.15, treeHeight, 3);
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);
    
    const geo3 = new CylinderGeometry(0, 0.8, treeHeight, 3);
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);

    return mergeBufferGeometries([geo, geo2, geo3]);
  }

  function stone(height, position) {
    const px = Math.random() * 0.4;
    const pz = Math.random() * 0.4;

    const geo = new SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
    geo.translate(position.x + px, height, position.y + pz);

    return geo;
  }

  function clouds(cloudMeshes) {
    // determines number of clouds
    let count = Math.floor(Math.pow(Math.random(), 0.45) * 4);
  
    for (let i = 0; i < count; i++) {
      // Create cloud geometry
      const puff1 = new SphereGeometry(1.2, 7, 7);
      const puff2 = new SphereGeometry(1.5, 7, 7);
      const puff3 = new SphereGeometry(0.9, 7, 7);
  
      puff1.translate(-1.85, Math.random() * 0.3, 0);
      puff2.translate(0, Math.random() * 0.3, 0);
      puff3.translate(1.85, Math.random() * 0.3, 0);
  
      const cloudGeo = mergeBufferGeometries([puff1, puff2, puff3]);
  
      // Set initial position and rotation for the cloud
      cloudGeo.translate(
        Math.random() * 20 - 10,
        Math.random() * 7 + 7,
        Math.random() * 20 - 10
      );
      cloudGeo.rotateY(Math.random() * Math.PI * 2);
  
      // Create cloud mesh
      const cloudMesh = new Mesh(
        cloudGeo,
        new MeshStandardMaterial({
          envMap: envmap,
          envMapIntensity: 0.75,
          flatShading: true,
        })
      );
  
      // Add the cloud mesh to the scene
      scene.add(cloudMesh);
      
      // Add the cloud mesh to the array for later reference
      cloudMeshes.push(cloudMesh);
    }
  }
}