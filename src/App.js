import { SimpleDropzone } from 'simple-dropzone';
import { PMREMGenerator } from 't3d/addons/textures/PMREMGenerator.js';
import { Viewer } from './Viewer.js';
import { UIControl } from './UIControl.js';
import { HDRTextureLoader } from './loaders/HDRTextureLoader.js';
import { EXRTextureLoader } from './loaders/EXRTextureLoader.js';
import { EnvExporter } from './exporters/EnvExporter.js';
import { ImageTextureLoader } from './loaders/ImageTextureLoader.js';
import { EnvTextureLoader } from './loaders/EnvTextureLoader.js';

export class App {

	constructor(el) {
		this.el = el;

		this.viewer = null;
		this.uiCtrl = null;

		// pmrem generator

		this.pmremGenerator = new PMREMGenerator(1024);
		this.pmremGenerator.legacy = false;

		// loaders

		this.imageTextureLoader = new ImageTextureLoader();
		this.hdrTextureLoader = new HDRTextureLoader();
		this.exrTextureLoader = new EXRTextureLoader();
		this.envTextureLoader = new EnvTextureLoader();

		// exporters

		this.envExporter = new EnvExporter();

		// use dragzone to load textures

		const dropEl = document.querySelector('.dropzone');
		const spinnerEl = el.querySelector('.spinner');

		const inputEl = document.querySelector('#file-input');
		const dropzone = new SimpleDropzone(dropEl, inputEl);
		dropzone.on('drop', ({ files }) => {
			const root = findRoot(files, /\.(hdr|exr|jpg|png|env)$/);

			if (!root || !root.file || !root.file.name || !root.file.name.endsWith) {
				onError('No HDR, EXR or ENV file found.');
				return;
			}

			if (!this.viewer) {
				const viewerEl = document.createElement('div');
				viewerEl.classList.add('viewer');
				dropEl.innerHTML = '';
				dropEl.appendChild(viewerEl);
				this.viewer = new Viewer(viewerEl);
				this.viewer.startRender();

				this.envTextureLoader.setRenderer(this.viewer.renderer);
			}

			const fileURL = typeof root.file === 'string' ? root.file : URL.createObjectURL(root.file);

			let loadPromise = null, needPrefilter = false;

			console.time('load');

			if (root.file.name.endsWith('.hdr')) {
				loadPromise = this.hdrTextureLoader.loadAsync(fileURL);
				needPrefilter = true;
			} else if (root.file.name.endsWith('.exr')) {
				loadPromise = this.exrTextureLoader.loadAsync(fileURL);
				needPrefilter = true;
			} else if (root.file.name.endsWith('.jpg') || root.file.name.endsWith('.png')) {
				loadPromise = this.imageTextureLoader.loadAsync(fileURL);
				needPrefilter = true;
			} else if (root.file.name.endsWith('.env')) {
				loadPromise = this.envTextureLoader.loadAsync(fileURL);
				needPrefilter = false;
			}

			if (needPrefilter) {
				loadPromise = loadPromise.then(texture => {
					const prefiltered = this.pmremGenerator.prefilter(this.viewer.renderer, texture);
					texture.dispose();
					return this.pmremGenerator.prefilter(this.viewer.renderer, prefiltered);
				});
			}

			loadPromise.then(texture => {
				spinnerEl.style.display = 'none';

				if (!this.uiCtrl) {
					this.uiCtrl = new UIControl(this);
				}

				this.viewer.setCubeTexture(texture);
				this.viewer.rotationY = 0; // reset rotation to 0

				URL.revokeObjectURL(fileURL);

				console.timeEnd('load');
			});
		});
		dropzone.on('dropstart', () => spinnerEl.style.display = '');
		dropzone.on('droperror', () => spinnerEl.style.display = 'none');

		spinnerEl.style.display = 'none';

		// resize viewer on window resize

		window.addEventListener('resize', () => {
			this.viewer && this.viewer.resize();
		}, true);
	}

}

function findRoot(files, matcher) {
	let result;

	Array.from(files).forEach(([uri, file]) => {
		if (file.name.match(matcher)) {
			const path = uri.replace(file.name, '');
			result = { file, path };
		}
	});

	return result;
}

function onError(error) {
	window.alert((error || {}).message || error.toString());
	console.error(error);
}

document.addEventListener('DOMContentLoaded', () => {
	new App(document.body);
});