import { createApp } from './app.js';

const mount = document.getElementById('app');

if (!mount) {
  throw new Error('Mount element #app not found');
}

createApp(mount);
