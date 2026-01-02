import * as THREE from 'three';
import { clearLookDelta, createInputState, InputState } from './sim/input.js';
import { defaultMovementParams, updatePlayer } from './sim/movement.js';
import { defaultPlayerState, PlayerState } from './sim/state.js';
import { createOverlay } from './ui/overlay.js';

type RendererSize = { width: number; height: number };

export interface DebugAPI {
  getPlayer: () => PlayerState;
  isRunning: () => boolean;
}

declare global {
  interface Window {
    __debug?: DebugAPI;
  }
}

const createRenderer = (size: RendererSize): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(size.width, size.height);
  renderer.setClearColor(0x0b1021);
  return renderer;
};

const createScene = (): { scene: THREE.Scene; camera: THREE.PerspectiveCamera; player: THREE.Object3D } => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1021, 10, 60);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
  camera.position.set(0, defaultPlayerState.position.y, 5);
  camera.rotation.order = 'YXZ';

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(10, 15, 5);
  scene.add(sun);

  const floorGeo = new THREE.PlaneGeometry(200, 200);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1f2b, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const playerGeo = new THREE.BoxGeometry(0.8, 1.6, 0.8);
  const playerMat = new THREE.MeshStandardMaterial({ color: 0x6ac2ff });
  const player = new THREE.Mesh(playerGeo, playerMat);
  player.position.set(0, 0.8, 0);
  scene.add(player);

  const wallGeo = new THREE.BoxGeometry(2, 2, 2);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3c3f55 });
  const wall1 = new THREE.Mesh(wallGeo, wallMat);
  wall1.position.set(4, 1, -4);
  const wall2 = new THREE.Mesh(wallGeo, wallMat);
  wall2.position.set(-3, 1, -8);
  scene.add(wall1, wall2);

  return { scene, camera, player };
};

const handlePointerLock = (element: HTMLElement, onChange: (locked: boolean) => void) => {
  const change = () => {
    onChange(document.pointerLockElement === element);
  };
  document.addEventListener('pointerlockchange', change);
  return () => document.removeEventListener('pointerlockchange', change);
};

export const createApp = (container: HTMLElement) => {
  const overlay = createOverlay();
  container.appendChild(overlay);

  const size = { width: container.clientWidth, height: container.clientHeight };
  const renderer = createRenderer(size);
  container.appendChild(renderer.domElement);

  const { scene, camera, player } = createScene();
  camera.aspect = size.width / Math.max(1, size.height);
  camera.updateProjectionMatrix();

  const input: InputState = createInputState();
  let playerState: PlayerState = { ...defaultPlayerState, position: { ...defaultPlayerState.position } };
  let running = false;
  let animationFrame = 0;

  const setRunning = (value: boolean) => {
    running = value;
    overlay.style.display = value ? 'none' : 'flex';
    clearLookDelta(input);
  };

  overlay.addEventListener('click', () => {
    if (document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock();
    }
    setRunning(true);
  });

  let pointerWasLocked = false;
  const release = handlePointerLock(renderer.domElement, locked => {
    if (locked) {
      pointerWasLocked = true;
    } else if (pointerWasLocked) {
      setRunning(false);
    }
  });

  const onKey = (down: boolean) => (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
        input.forward = down;
        break;
      case 'KeyS':
        input.backward = down;
        break;
      case 'KeyA':
        input.left = down;
        break;
      case 'KeyD':
        input.right = down;
        break;
      case 'ShiftLeft':
        input.sprint = down;
        break;
      default:
        break;
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!running) return;
    input.lookDeltaX += event.movementX;
    input.lookDeltaY += event.movementY;
  };

  const onKeyDown = onKey(true);
  const onKeyUp = onKey(false);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointermove', onPointerMove);

  const onResize = () => {
    const newSize = { width: container.clientWidth, height: container.clientHeight };
    camera.aspect = newSize.width / newSize.height;
    camera.updateProjectionMatrix();
    renderer.setSize(newSize.width, newSize.height);
  };
  window.addEventListener('resize', onResize);

  let lastTime = performance.now();

  const step = () => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (running) {
      playerState = updatePlayer(playerState, input, dt, defaultMovementParams);
      clearLookDelta(input);
    }

    player.position.set(playerState.position.x, playerState.position.y / 2, playerState.position.z);
    player.rotation.y = playerState.yaw;
    camera.position.set(playerState.position.x, playerState.position.y, playerState.position.z);
    camera.rotation.set(playerState.pitch, playerState.yaw, 0);

    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(step);
  };

  animationFrame = requestAnimationFrame(step);

  window.__debug = {
    getPlayer: () => ({
      position: { ...playerState.position },
      yaw: playerState.yaw,
      pitch: playerState.pitch
    }),
    isRunning: () => running
  };

  return {
    dispose: () => {
      cancelAnimationFrame(animationFrame);
      release();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      container.removeChild(overlay);
    }
  };
};
