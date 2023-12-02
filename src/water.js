import * as THREE from './more_assets/three.module.js';
import { GUI } from './more_assets/lil-gui.module.min.js';
import { OrbitControls } from './more_assets/OrbitControls.js';
import { Water } from './more_assets/Water2.js';

export function setupWaterScene() {
  let scene, camera, renderer, water;

  const params = {
    color: '#ffffff',
    scale: 4,
    flowX: 1,
    flowY: 1
  };

  init();
  animate();

  function init() {

    // scene
    scene = new THREE.Scene();

    // camera

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 200 );
    camera.position.set( - 15, 7, 15 );
    camera.lookAt( scene.position );


    // water

    const waterGeometry = new THREE.PlaneGeometry( 20, 20 );

    water = new Water( waterGeometry, {
      color: params.color,
      scale: params.scale,
      flowDirection: new THREE.Vector2( params.flowX, params.flowY ),
      textureWidth: 1024,
      textureHeight: 1024
    } );

    water.position.y = 1;
    water.rotation.x = Math.PI * - 0.5;
    scene.add( water );

    // skybox

    const cubeTextureLoader = new THREE.CubeTextureLoader();
    cubeTextureLoader.setPath( 'textures/cube/' );

    const cubeTexture = cubeTextureLoader.load( [
      'posx.jpg', 'negx.jpg',
      'posy.jpg', 'negy.jpg',
      'posz.jpg', 'negz.jpg'
    ] );
    

    scene.background = cubeTexture;

    // light

    const ambientLight = new THREE.AmbientLight( 0xe7e7e7, 1.2 );
    scene.add( ambientLight );

    const directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
    directionalLight.position.set( - 1, 1, 1 );
    scene.add( directionalLight );

    // renderer

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    document.body.appendChild( renderer.domElement );

    // gui

    
    const gui = new GUI();

    gui.addColor( params, 'color' ).onChange( function ( value ) {

      water.material.uniforms[ 'color' ].value.set( value );

    } );
    gui.add( params, 'flowX', - 1, 1 ).step( 0.01 ).onChange( function ( value ) {

      water.material.uniforms[ 'flowDirection' ].value.x = value;
      water.material.uniforms[ 'flowDirection' ].value.normalize();

    } );
    gui.add( params, 'flowY', - 1, 1 ).step( 0.01 ).onChange( function ( value ) {

      water.material.uniforms[ 'flowDirection' ].value.y = value;
      water.material.uniforms[ 'flowDirection' ].value.normalize();

    } );

    gui.open();
    

    //

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.minDistance = 5;
    controls.maxDistance = 50;

    //

    window.addEventListener( 'resize', onWindowResize );

  }

  function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

  }


  function animate() {
    requestAnimationFrame( animate );
    render();
  }


  function render() {
    renderer.render( scene, camera );
  }
}