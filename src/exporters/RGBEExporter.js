import { CubemapToEquirectangular } from './CubemapToEquirectangular.js';
import { RGBEEncoder } from './RGBEEncoder.js';

/**
 * refer to https://github.com/DerSchmale/io-rgbe/blob/main/src/encode.ts
 */
export class RGBEExporter {

	constructor() {
		this._rgbeEncoder = new RGBEEncoder();
		this._equiConverter = new CubemapToEquirectangular();
		this._equiConverter.readPixels = false;
	}

	toBuffer(viewer) {
		const texture = viewer._skyBox.texture;

		// Convert to RGBE

		this._equiConverter.rotation.y = viewer.rotationY / 180 * Math.PI;
		const equiTexture = this._equiConverter.convert(viewer.renderer, texture);
		const rgbeTexture = this._rgbeEncoder.encode(viewer.renderer, equiTexture);
		const { data: rgbeData, width, height } = rgbeTexture.image;

		// Write to buffer

		const encoded = [];

		let header =
			'#?RADIANCE\n# Made with t3d-ibl-baker\n' +
			'EXPOSURE=1\n' +
			'GAMMA=1\n' +
			'PRIMARIES=0 0 0 0 0 0 0 0\nFORMAT=32-bit_rle_rgbe\n\n';

		header += '-Y ' + height + ' +X ' + width + '\n';

		for (let i = 0; i < header.length; ++i) {
			encoded.push(header.charCodeAt(i));
		}

		let i = 0;

		for (let y = 0; y < height; ++y) {
			// 0x0202 and 16-bit for width
			encoded.push(0x02, 0x02, (width & 0xff00) >> 8, width & 0xff);

			const scanline = [[], [], [], []];

			for (let x = 0; x < width; ++x) {
				scanline[0].push(rgbeData[i]);
				scanline[1].push(rgbeData[i + 1]);
				scanline[2].push(rgbeData[i + 2]);
				scanline[3].push(rgbeData[i + 3]);
				i += 4;
			}

			scanline.forEach(s => encodeRLE(s, encoded));
		}

		// Dispose & return

		equiTexture.dispose();

		return new Uint8Array(encoded).buffer;
	}

}

/**
 * Straight port from https://www.graphics.cornell.edu/~bjw/rgbe/rgbe.c
 */
function encodeRLE(data, encoded) {
	const minRunLen = 4;
	const len = data.length;
	let i = 0;
	while (i < len) {
		let runStart = i;
		// find next run of length at least 4 if one exists
		let runCount = 0;
		let prevRunCount = 0;
		while ((runCount < minRunLen) && (runStart < len)) {
			runStart += runCount;
			prevRunCount = runCount;
			runCount = 1;
			while ((runStart + runCount < len) && (runCount < 127)
				&& (data[runStart] == data[runStart + runCount])) { runCount++ }
		}
		// if data before next big run is a short run then write it as such
		if ((prevRunCount > 1) && (prevRunCount == runStart - i)) {
			encoded.push(128 + prevRunCount, data[i]);
			i = runStart;
		}
		// write out bytes until we reach the start of the next run
		while (i < runStart) {
			let count = runStart - i;
			if (count > 128) { count = 128 }
			encoded.push(count);
			for (let d = 0; d < count; ++d) { encoded.push(data[i + d]) }
			i += count;
		}
		/* write out next run if one was found */
		if (runCount >= minRunLen) {
			encoded.push(128 + runCount, data[runStart]);
			i += runCount;
		}
	}
}