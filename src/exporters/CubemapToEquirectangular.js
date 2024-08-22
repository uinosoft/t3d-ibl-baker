import { ShaderPostPass, RenderTarget2D, TEXTURE_FILTER, PIXEL_TYPE, ATTACHMENT, Euler, Texture2D, PIXEL_FORMAT, Matrix3, Quaternion, Matrix4 } from 't3d';

export class CubemapToEquirectangular {

	constructor() {
		this.rotation = new Euler();

		this.readPixels = false;

		this.convertPass = new ShaderPostPass(convertShader);
	}

	convert(renderer, source, target = new Texture2D()) {
		if (!source.isTextureCube) {
			console.error('CubemapToEquirectangular: The source texture is not a cube texture.');
			return null;
		}

		const readPixels = this.readPixels;

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

		// Calculate the size of the equirectangular map

		const cubeSize = source.images[0].width;
		const width = cubeSize * 4, height = cubeSize * 2;

		// Prepare the target texture

		target.type = PIXEL_TYPE.HALF_FLOAT;
		target.format = PIXEL_FORMAT.RGBA;
		target.minFilter = TEXTURE_FILTER.LINEAR;
		target.generateMipmaps = false;

		// Prepare render target

		const renderTarget = new RenderTarget2D(width, height);
		renderTarget.detach(ATTACHMENT.DEPTH_STENCIL_ATTACHMENT);

		if (readPixels) {
			renderTarget.texture.type = PIXEL_TYPE.HALF_FLOAT;
			renderTarget.texture.minFilter = TEXTURE_FILTER.LINEAR;
			renderTarget.texture.generateMipmaps = false;
		} else {
			renderTarget.attach(target, ATTACHMENT.COLOR_ATTACHMENT0);
		}

		// Render

		_quat_1.setFromEuler(this.rotation).toMatrix4(_mat4_1);
		_mat3_1.setFromMatrix4(_mat4_1);

		renderer.setRenderTarget(renderTarget);
		this.convertPass.uniforms.environmentMap = source;
		_mat3_1.toArray(this.convertPass.uniforms.rotation);
		this.convertPass.render(renderer);

		if (readPixels) {
			const pixels = new Uint16Array(4 * width * height);
			renderer.readRenderTargetPixels(0, 0, width, height, pixels);
			target.image = { data: pixels, width, height };
			target.flipY = false;
			target.version++;
		}

		// Clear render stuff

		!readPixels && renderTarget.detach(ATTACHMENT.COLOR_ATTACHMENT0);
		renderTarget.dispose();

		// Return the target texture

		return target;
	}

	dispose() {
		this.convertPass.dispose();
	}

}

const _quat_1 = new Quaternion();
const _mat3_1 = new Matrix3();
const _mat4_1 = new Matrix4();

const convertShader = {
	name: 'cube_to_equi',
	uniforms: {
		environmentMap: null,
		envMapFlip: -1,
		rotation: new Float32Array([
			1, 0, 0,
			0, 1, 0,
			0, 0, 1
		])
	},
	vertexShader: `
		#include <common_vert>

		attribute vec2 a_Uv;
		varying vec2 v_Uv;

		uniform float envMapFlip;

		void main()  {
			v_Uv = vec2(envMapFlip * a_Uv.x, a_Uv.y);
			gl_Position = u_ProjectionView * u_Model * vec4(a_Position, 1.0);
		}
	`,
	fragmentShader: `
		#include <common_frag>

		uniform samplerCube environmentMap;
		uniform mat3 rotation;

		varying vec2 v_Uv;

		void main() {
			vec2 uv = v_Uv;

			float longitude = uv.x * 2. * PI - PI / 2.;
			float latitude = uv.y * PI;

			vec3 dir = vec3(
				-sin(longitude) * sin(latitude),
				cos(latitude),
				-cos(longitude) * sin(latitude)
			);
			dir = rotation * dir;
			dir = normalize(dir);

			vec4 color = textureCube(environmentMap, dir);

			gl_FragColor = color;
		}
	`
};