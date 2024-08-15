import { Texture2D } from 't3d';
import { EXRLoader } from 't3d/examples/jsm/loaders/EXRLoader.js';
import * as fflate from 'fflate';

export class EXRTextureLoader extends EXRLoader {

	load(url, onLoad, onProgress, onError) {
		const _onLoad = textureData => {
			const texture = new Texture2D();
			texture.image = { data: textureData.data, width: textureData.width, height: textureData.height };
			texture.version++;

			texture.type = textureData.type;
			texture.format = textureData.format;
			texture.magFilter = textureData.magFilter;
			texture.minFilter = textureData.minFilter;
			texture.flipY = textureData.flipY;
			texture.generateMipmaps = textureData.generateMipmaps;

			onLoad(texture);
		};

		super.load(url, _onLoad, onProgress, onError);
	}

}

EXRTextureLoader.setfflate(fflate);