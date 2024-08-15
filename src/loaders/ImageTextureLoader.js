import { TEXEL_ENCODING_TYPE, Texture2D } from 't3d';
import { ImageBitmapLoader } from 't3d/examples/jsm/loaders/ImageBitmapLoader.js';

export class ImageTextureLoader extends ImageBitmapLoader {

	load(url, onLoad, onProgress, onError) {
		const _onLoad = imageBitmap => {
			const texture = new Texture2D();
			texture.image = imageBitmap;
			texture.encoding = TEXEL_ENCODING_TYPE.SRGB;
			texture.version++;

			onLoad(texture);
		};

		super.load(url, _onLoad, onProgress, onError);
	}

}