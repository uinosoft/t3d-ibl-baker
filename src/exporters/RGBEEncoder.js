import { ATTACHMENT, PIXEL_FORMAT, PIXEL_TYPE, RenderTarget2D, ShaderPostPass, Texture2D } from 't3d';

/**
 * RGBE encoder for 2D texture.
 */
export class RGBEEncoder {

	constructor() {
		this.encodePass = new ShaderPostPass(encodeShader);
	}

	/**
	 * Encode 2D texture to RGBE
	 * @param {ThinRenderer} renderer - The renderer
	 * @param {Texture2D} source - The source 2D texture
	 * @param {Texture2D} target - The target 2D texture to store the encoded result
	 * @return {Texture2D|Null} The target 2D texture, you can get the image data from the image attribute
	 */
	encode(renderer, source, target = new Texture2D()) {
		if (!source.isTexture2D) {
			console.error('RGBDEncoder: The source texture is not a 2d texture.');
			return null;
		}

		// Check capabilities

		const capabilities = renderer.capabilities;
		const isWebGL2 = capabilities.version > 1;

		if (isWebGL2) {
			capabilities.getExtension('EXT_color_buffer_float');
		} else {
			capabilities.getExtension('OES_texture_half_float');
			capabilities.getExtension('OES_texture_half_float_linear');
		}

		capabilities.getExtension('OES_texture_float_linear');
		capabilities.getExtension('EXT_color_buffer_half_float');

		//

		const { width, height } = source.image;

		// Prepare the target texture

		target.type = PIXEL_TYPE.UNSIGNED_BYTE;
		target.format = PIXEL_FORMAT.RGBA;
		target.generateMipmaps = false;

		// Prepare render target

		const renderTarget = new RenderTarget2D(width, height);
		renderTarget.detach(ATTACHMENT.DEPTH_STENCIL_ATTACHMENT);
		renderTarget.texture.type = PIXEL_TYPE.UNSIGNED_BYTE;
		renderTarget.texture.format = PIXEL_FORMAT.RGBA;
		renderTarget.texture.generateMipmaps = false;

		// Render

		renderer.setRenderTarget(renderTarget);
		this.encodePass.uniforms.inputTexture = source;
		this.encodePass.render(renderer);

		const data = new Uint8Array(4 * width * height);
		renderer.readRenderTargetPixels(0, 0, width, height, data);

		target.image = { data, width, height };
		target.version++;

		// Clear render stuff

		renderTarget.dispose();

		// Return the target texture

		return target;
	}

	dispose() {
		this.encodePass.dispose();
	}

}

const encodeShader = {
	name: 'rgbe_encode',
	defines: {},
	uniforms: {
		inputTexture: null
	},
	vertexShader: `
		attribute vec3 a_Position;
		attribute vec2 a_Uv;

		uniform mat4 u_ProjectionView;
		uniform mat4 u_Model;

		varying vec2 v_Uv;

		void main() {
			v_Uv = a_Uv;
			gl_Position = u_ProjectionView * u_Model * vec4(a_Position, 1.0);
		}
    `,
	fragmentShader: `
		uniform sampler2D inputTexture;
		varying vec2 v_Uv;
		void main() {
			vec4 color = texture2D(inputTexture, v_Uv);

			float maxComponent = max(max(color.r, color.g), color.b) / 255.0;
			float e = clamp(ceil(log2(maxComponent)) + 136.0, 0.0, 255.0);
			float sc = 1.0 / pow(2.0, e - 136.0);

			vec4 rgbe = vec4(color.rgb * sc, e);
			rgbe = clamp(rgbe / 255.0, 0.0, 1.0);

			gl_FragColor = rgbe;
		}
    `
};