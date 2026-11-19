'use strict';

const state = { scenes: [], scene: null, image: null, viewer: null };

const $ = (id) => document.getElementById(id);

// "dining-kitchen.jpg" -> "Dining Kitchen", "living_room_2" -> "Living Room 2"
function pretty(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function loadIndex() {
  $('status').textContent = 'Loading scenes…';
  try {
    const res = await fetch('scenes.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.scenes = data.scenes || [];
  } catch (err) {
    state.scenes = [];
    $('status').textContent = 'Could not load the tour. Please refresh. (' + err.message + ')';
    return;
  }

  const sceneSelect = $('scene-select');

  if (!state.scenes.length) {
    sceneSelect.replaceChildren(new Option('No scenes found', ''));
    sceneSelect.disabled = true;
    $('image-select').replaceChildren(new Option('--', ''));
    $('image-select').disabled = true;
    $('status').textContent = 'No panoramas are available.';
    return;
  }

  sceneSelect.replaceChildren();
  for (const scene of state.scenes) {
    sceneSelect.append(new Option(pretty(scene.name), scene.name));
  }
  sceneSelect.disabled = false;
  selectScene(state.scenes[0].name);
}

function selectScene(name) {
  state.scene = name;
  const scene = state.scenes.find((s) => s.name === name);
  const imageSelect = $('image-select');
  imageSelect.replaceChildren();

  if (!scene || !scene.images.length) {
    imageSelect.append(new Option('No images', ''));
    imageSelect.disabled = true;
    $('view-title').textContent = pretty(name);
    $('view-meta').textContent = 'No images in this scene';
    $('status').textContent = '';
    return;
  }

  for (const image of scene.images) {
    imageSelect.append(new Option(pretty(image), image));
  }
  imageSelect.disabled = false;
  selectImage(scene.images[0]);
}

function selectImage(name) {
  state.image = name;
  if (!state.scene || !state.image) return;

  const panorama =
    'scenes/' + encodeURIComponent(state.scene) + '/' + encodeURIComponent(state.image);

  $('view-title').textContent = pretty(state.image);
  $('view-meta').textContent = pretty(state.scene);
  $('status').textContent = 'Opening ' + pretty(state.image) + '…';
  loadPanorama(panorama);
}

function loadPanorama(panorama) {
  if (state.viewer) {
    try { state.viewer.destroy(); } catch (e) { /* ignore */ }
  }
  state.viewer = pannellum.viewer('panorama', {
    type: 'equirectangular',
    panorama: panorama,
    autoLoad: true,
    hfov: 90,
    minHfov: 45,
    maxHfov: 115,
    compass: false,
    showControls: false,
    keyboardZoom: true,
    mouseZoom: true,
    friction: 0.2
  });
  state.viewer.on('load', () => { $('status').textContent = ''; });
  state.viewer.on('error', () => {
    $('status').textContent = 'Unable to open this panorama.';
  });
}

// View controls
$('zoom-in').onclick = () => state.viewer && state.viewer.setHfov(Math.max(45, state.viewer.getHfov() - 10), 200);
$('zoom-out').onclick = () => state.viewer && state.viewer.setHfov(Math.min(115, state.viewer.getHfov() + 10), 200);
$('reset').onclick = () => state.viewer && state.viewer.lookAt(0, 0, 90, 500);
$('fullscreen').onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
};

// Pickers
$('scene-select').addEventListener('change', (e) => selectScene(e.target.value));
$('image-select').addEventListener('change', (e) => selectImage(e.target.value));

loadIndex();
