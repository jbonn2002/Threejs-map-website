import './style.css'
import * as THREE from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import { FloatType, Light, PCFShadowMap } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { createNoise2D } from 'simplex-noise';

import water from './public/water.jpg'
import mossTexture from './public/mosstexture.jpg'
import stoneTexture from './public/stonetexture.jpg'
import groundTexture from './public/groundtexture.jpg'
import sandGravelTexture from './public/sandgraveltexture.jpg'
import dirtTexture from './public/dirttexture.jpg'


const scene = new THREE.Scene();
scene.background = new THREE.Color("#CCDDD3");

const camera = new THREE.PerspectiveCamera( 45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set( -17,31,33, );
// camera.position.set(0,0,50)


const renderer = new THREE.WebGLRenderer( { antialias: true} );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.useLegacyLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild( renderer.domElement )

const light = new THREE.PointLight( new THREE.Color('#ffcb8e').convertSRGBToLinear().convertSRGBToLinear(), 1, 200 );
light.position.set( 10, 20, 10);

light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;
scene.add( light );


const controls = new OrbitControls( camera, renderer.domElement );
controls.target.set( 0, 0, 0 )
controls.dampingFactor = 0.05;
controls.enableDamping = true;

let envmap;

const MAX_HEIGHT = 10;
const DIRT2_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
const SAND_HEIGHT = MAX_HEIGHT * 0.3;
const STONE_HEIGHT = MAX_HEIGHT * 0;

(async function(){
  let pmrem = new THREE.PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync("/clarens-night.hdr");
  envmap = pmrem.fromEquirectangular(envmapTexture).texture;

  const textureLoader = new THREE.TextureLoader();

  let textures = {
    dirt: await textureLoader.loadAsync(dirtTexture),
    dirt2: await textureLoader.loadAsync(groundTexture),
    mossTexture: await textureLoader.loadAsync(mossTexture),
    sand: await textureLoader.loadAsync(sandGravelTexture),
    stoneTexture: await textureLoader.loadAsync(stoneTexture),
    water: await textureLoader.loadAsync(water)
  }



  let noise2D = createNoise2D();

  for ( let i = -15; i < 15; i++ ){
    for ( let j = -15; j < 15; j++ ){
      let position = tileToPosition( i, j );

      if( position.length() > 16 ) continue;

      let noise = (noise2D( i * 0.1 , j * 0.1 ) + 1) * 0.5;
      noise = Math.pow( noise, 1.5 );

      makeHex( noise * MAX_HEIGHT, position);

    }
  }


  let stoneMesh = hexMesh( stoneGeo, textures.stoneTexture);
  let grassMesh = hexMesh( grassGeo, textures.mossTexture);
  let dirt2Mesh = hexMesh( dirt2Geo, textures.dirt2);
  let dirtMesh = hexMesh( dirtGeo, textures.dirt);
  let sandMesh = hexMesh( sandGeo, textures.sand);
  scene.add( stoneMesh, grassMesh, dirtMesh, dirt2Mesh, sandMesh);


  let seaMesh = new THREE.Mesh(
    new THREE.CylinderGeometry( 17, 17, MAX_HEIGHT * 0.2, 50),
    new THREE.MeshPhysicalMaterial({
      envMap: envmap,
      color: new THREE.Color('#55aaff').convertSRGBToLinear().multiplyScalar(3),
      ior: 1.4,
      transmission: 1,
      transparent: true,
      thickness: 1.5,
      envMapIntensity: 0.2,
      roughness: 0.5,
      metalness: 0.025,
      roughnessMap: textures.water,
      metalnessMap: textures.water
    })
  );

  seaMesh.receiveShadow = true;
  seaMesh.position.set( 0, MAX_HEIGHT * 0.1, 0);
  scene.add( seaMesh );



  function tileToPosition( tileX, tileY ){
    return new THREE.Vector2(( tileX + ( tileY % 2 ) * 0.5 ) * 1.77, tileY * 1.535 );
  }



  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene,camera);
  });
})();


let stoneGeo = new THREE.BoxGeometry(0,0,0);
let dirtGeo = new THREE.BoxGeometry(0,0,0);
let dirt2Geo = new THREE.BoxGeometry(0,0,0);
let sandGeo = new THREE.BoxGeometry(0,0,0);
let grassGeo = new THREE.BoxGeometry(0,0,0);

function hexGeometry( height, position ){
  let geo = new THREE.CylinderGeometry( 1, 1, height, 6, 1, false );
  geo.translate( position.x, height * 0.5, position.y );

  return geo
}


function makeHex( height, position ){

  let geo = hexGeometry( height, position );

  if ( height > DIRT2_HEIGHT ){
    dirt2Geo = BufferGeometryUtils.mergeBufferGeometries( [ geo, dirt2Geo] );
  }else if(height > DIRT_HEIGHT){
    dirtGeo = BufferGeometryUtils.mergeBufferGeometries( [ geo, dirtGeo] );
  }else if(height > GRASS_HEIGHT){
    grassGeo = BufferGeometryUtils.mergeBufferGeometries( [ geo, grassGeo] );
  }else if(height > SAND_HEIGHT){
    sandGeo = BufferGeometryUtils.mergeBufferGeometries( [ geo, sandGeo] );
  }else if(height > STONE_HEIGHT){
    stoneGeo = BufferGeometryUtils.mergeBufferGeometries( [ geo, stoneGeo] );
  }

}


function hexMesh( geo, map ){
  let mat = new THREE.MeshPhysicalMaterial({
    envMap: envmap,
    envMapIntensity: 0.135,
    flatShading: true,
    map
  });

  let mesh = new THREE.Mesh( geo, mat );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh

}



