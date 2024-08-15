import { RGBDEncoder } from './RGBDEncoder.js';

export class EnvExporter {

	constructor() {
		this._rgbdEncoder = new RGBDEncoder();
	}

	async toBuffer(viewer) {
		this._rgbdEncoder.rotation.y = viewer.rotationY / 180 * Math.PI;
		const appliedTexture = this._rgbdEncoder.encode(viewer.renderer, viewer._skyBox.texture);

		const imageBuffers = [];

		for (const faces of appliedTexture.mipmaps) {
			for (const mipmap of faces) {
				imageBuffers.push(await encodeToPNG(mipmap));
			}
		}

		const headerByteLength = 8,
			version = 1;

		// Step 1: Prepare json data

		const jsonData = {
			generator: 't3d-ibl-baker',
			imageSize: appliedTexture.images[0].width,
			mipmaps: []
		};

		let position = 0;
		imageBuffers.forEach(imageBuffer => {
			const byteLength = imageBuffer.byteLength;
			jsonData.mipmaps.push({
				length: byteLength,
				position: position
			});
			position += byteLength;
		});

		// Step 2: Prepare json buffer

		const jsonString = JSON.stringify(jsonData);
		const jsonBuffer = new ArrayBuffer(jsonString.length);
		const jsonBufferUint8View = new Uint8Array(jsonBuffer); // Limited to ascii subset matching unicode.
		for (let i = 0, strLen = jsonString.length; i < strLen; i++) {
			jsonBufferUint8View[i] = jsonString.charCodeAt(i);
		}

		const jsonByteLength = jsonBuffer.byteLength;

		// Step 3: Generate final buffer

		// computes the final required size and creates the storage
		const totalSize = headerByteLength + jsonByteLength + position;

		const finalBuffer = new ArrayBuffer(totalSize);
		const finalBufferView = new DataView(finalBuffer);
		const finalBufferUint8View = new Uint8Array(finalBuffer);

		// write header to buffer
		finalBufferView.setUint32(0, version);
		finalBufferView.setUint32(4, jsonByteLength);

		let pos = headerByteLength;

		// copy json data buffer
		finalBufferUint8View.set(jsonBufferUint8View, pos);
		pos += jsonByteLength;

		// set image buffers
		imageBuffers.forEach(imageBuffer => {
			finalBufferUint8View.set(new Uint8Array(imageBuffer), pos);
			pos += imageBuffer.byteLength;
		});

		// Step 4: Dispose & return

		appliedTexture.dispose();

		return finalBuffer;
	}

}

let sharedCanvas = null;
let sharedContext = null;

function encodeToPNG(dataImage) {
	const { data, width, height } = dataImage;

	if (!sharedCanvas || !sharedContext) {
		sharedCanvas = document.createElement('canvas');
		sharedContext = sharedCanvas.getContext('2d');
	}

	sharedCanvas.width = width;
	sharedCanvas.height = height;

	const imageData = sharedContext.createImageData(width, height);
	imageData.data.set(data);
	sharedContext.putImageData(imageData, 0, 0);

	return new Promise((resolve, reject) => {
		sharedCanvas.toBlob(blob => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = reject;
			reader.readAsArrayBuffer(blob);
		}, 'image/png');
	});
}