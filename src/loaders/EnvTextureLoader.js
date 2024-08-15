import { Loader, FileLoader, TextureCube, ImageLoader, PIXEL_TYPE, PIXEL_FORMAT } from 't3d';
import { ImageBitmapLoader } from 't3d/examples/jsm/loaders/ImageBitmapLoader.js';
import { RGBDDecoder } from './RGBDDecoder.js';

export class EnvTextureLoader extends Loader {

	constructor(manager) {
		super(manager);

		this._imageLoader = getImageLoader(manager);

		this._rgbdDecoder = new RGBDDecoder();

		this._renderer = null;
	}

	setRenderer(renderer) {
		this._renderer = renderer;
	}

	load(url, onLoad, onProgress, onError) {
		const scope = this;

		const loader = new FileLoader(this.manager);
		loader.setResponseType('arraybuffer');
		loader.setRequestHeader(this.requestHeader);
		loader.setPath(this.path);
		loader.setWithCredentials(this.withCredentials);

		loader.load(url, function(buffer) {
			if (onLoad !== undefined) {
				onLoad(scope.parse(buffer));
			}
		}, onProgress, onError);
	}

	parse(buffer) {
		const headerByteLength = 8;

		const bufferView = new DataView(buffer);
		const jsonByteLength = bufferView.getUint32(4);

		const jsonString = new TextDecoder().decode(buffer.slice(headerByteLength, headerByteLength + jsonByteLength));
		const jsonData = JSON.parse(jsonString);

		const { imageSize, mipmaps } = jsonData;

		// Double checks the mipmaps length
		let mipmapsCount = Log2(imageSize);
		mipmapsCount = Math.round(mipmapsCount) + 1;
		if (mipmaps.length !== 6 * mipmapsCount) {
			throw new Error(
				`Unsupported mipmaps number "${mipmaps.length}"`
			);
		}

		const promises = mipmaps.map(mipmap => {
			const mipmapBuffer = new Uint8Array(
				buffer,
				headerByteLength + jsonByteLength + mipmap.position,
				mipmap.length
			);

			const blob = new Blob([mipmapBuffer], { type: 'image/png' });
			const url = URL.createObjectURL(blob);
			return this._imageLoader.loadAsync(url).then(image => {
				URL.revokeObjectURL(url);
				return image;
			});
		});

		return Promise.all(promises).then(images => {
			const tempCubeTexture = new TextureCube();

			tempCubeTexture.type = PIXEL_TYPE.UNSIGNED_BYTE;
			tempCubeTexture.format = PIXEL_FORMAT.RGBA;
			tempCubeTexture.generateMipmaps = false;

			const mipmapCount = images.length / 6;
			for (let level = 0; level < mipmapCount; level++) {
				const subImages = images.slice(level * 6, level * 6 + 6);
				if (level === 0) {
					tempCubeTexture.images = subImages;
				}
				tempCubeTexture.mipmaps.push(subImages);
			}
			tempCubeTexture.version++;

			const outputTexture = this._rgbdDecoder.decode(this._renderer, tempCubeTexture);

			tempCubeTexture.dispose();

			return outputTexture;
		});
	}

}

function Log2(value) {
	return Math.log(value) * Math.LOG2E;
}

function getImageLoader(manager) {
	const userAgent = navigator.userAgent;

	const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent) === true;
	const safariMatch = userAgent.match(/Version\/(\d+)/);
	const safariVersion = isSafari && safariMatch ? parseInt(safariMatch[1], 10) : -1;

	const isFirefox = userAgent.indexOf('Firefox') > -1;
	const firefoxVersion = isFirefox ? userAgent.match(/Firefox\/([0-9]+)\./)[1] : -1;

	if (typeof createImageBitmap === 'undefined' || (isSafari && safariVersion < 17) || (isFirefox && firefoxVersion < 98)) {
		return new ImageLoader(manager);
	} else {
		return new ImageBitmapLoader(manager);
	}
}