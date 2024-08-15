import { ATTACHMENT, BoxGeometry, DRAW_SIDE, Euler, Mesh, PIXEL_FORMAT, PIXEL_TYPE, Quaternion, RenderTargetCube, Scene, ShaderMaterial, TextureCube } from 't3d';
import { ReflectionProbe } from 't3d/examples/jsm/probes/ReflectionProbe.js';

/**
 * RGBD encoder for cube texture with mipmaps.
 */
export class RGBDEncoder {

	constructor() {
		this.rotation = new Euler();

		// init

		const geometry = new BoxGeometry(1, 1, 1);
		const material = new ShaderMaterial(encodeShader);
		material.side = DRAW_SIDE.BACK;
		const envMesh = new Mesh(geometry, material);
		envMesh.frustumCulled = false;

		const dummyScene = new Scene();
		dummyScene.add(envMesh);

		const quaternion = new Quaternion();
		this.rotation.onChange(() => { // auto sync rotation to dummyScene
			quaternion.setFromEuler(this.rotation);
			quaternion.toMatrix4(dummyScene.anchorMatrix);
		});

		this._envMesh = envMesh;
		this._dummyScene = dummyScene;
	}

	/**
	 * Encode cube texture to RGBD with sRGB color space
	 * @param {ThinRenderer} renderer - The renderer
	 * @param {TextureCube} source - The source cube texture, must has mipmaps
	 * @param {TextureCube} target - The target cube texture to store the encoded result
	 * @return {TextureCube|Null} The target cube texture, you can get the mipmaps data from the mipmaps attribute
	 */
	encode(renderer, source, target = new TextureCube()) {
		if (!source.isTextureCube) {
			console.error('RGBDEncoder: The source texture is not a cube texture.');
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

		// Calculate mipmaps number and cube size

		let cubeSize = source.images.length === 0 ? 16 : source.images[0].width;
		const mipmapNum = Math.floor(Math.log2(cubeSize));
		cubeSize = Math.pow(2, mipmapNum);

		// Prepare the target texture

		target.type = PIXEL_TYPE.UNSIGNED_BYTE;
		target.format = PIXEL_FORMAT.RGBA;
		target.generateMipmaps = false;

		let mipmapSize = cubeSize;
		for (let i = 0; i < mipmapNum + 1; i++) {
			target.mipmaps[i] = [];
			for (let j = 0; j < 6; j++) {
				target.mipmaps[i].push({ width: mipmapSize, height: mipmapSize, data: null });
			}
			mipmapSize = mipmapSize / 2;
		}

		// Prepare render target

		const renderTarget = new RenderTargetCube(cubeSize, cubeSize);
		renderTarget.detach(ATTACHMENT.DEPTH_STENCIL_ATTACHMENT);
		renderTarget.texture.type = PIXEL_TYPE.UNSIGNED_BYTE;
		renderTarget.texture.format = PIXEL_FORMAT.RGBA;
		renderTarget.texture.generateMipmaps = false;

		// Prepare render stuff

		const reflectionProbe = new ReflectionProbe(renderTarget);
		this._dummyScene.add(reflectionProbe.camera);

		let envMapFlip = 1;
		if (source.images[0] && source.images[0].rtt) {
			envMapFlip = -1;
		}

		this._envMesh.material.cubeMap = source;
		this._envMesh.material.uniforms.environmentMap = source;
		this._envMesh.material.uniforms.envMapFlip = envMapFlip;

		// Render mipmaps

		this._dummyScene.updateRenderStates(reflectionProbe.camera);

		for (let i = 0; i < mipmapNum + 1; i++) {
			this._envMesh.material.uniforms.level = i;

			reflectionProbe.render(renderer, this._dummyScene);
			for (let j = 0; j < 6; j++) {
				const mipmapData = target.mipmaps[i][j];
				mipmapData.data = new Uint8Array(mipmapData.width * mipmapData.height * 4);
				renderTarget.activeCubeFace = j;
				renderer.setRenderTarget(renderTarget);
				renderer.readRenderTargetPixels(0, 0, mipmapData.width, mipmapData.height, mipmapData.data);
				if (i === 0) {
					target.images[j] = mipmapData;
				}
			}
			renderTarget.resize(renderTarget.width / 2, renderTarget.height / 2);
		}

		target.version++;

		// Clear render stuff

		renderTarget.dispose();
		this._dummyScene.remove(reflectionProbe.camera);

		// Return the target texture

		return target;
	}

	dispose() {
		this._envMesh.geometry.dispose();
		this._envMesh.material.dispose();
	}

}

const encodeShader = {
	name: 'rgbd_encode',
	defines: {},
	uniforms: {
		environmentMap: null,
		envMapFlip: -1,
		level: 0
	},
	vertexShader: `
        #include <common_vert>
		varying vec3 vDir;
		void main() {
			vDir = (u_Model * vec4(a_Position, 0.0)).xyz;
			gl_Position = u_ProjectionView * u_Model * vec4(a_Position, 1.0);
			gl_Position.z = gl_Position.w; // set z to camera.far
		}
    `,
	fragmentShader: `
        #include <common_frag>

        uniform samplerCube environmentMap;
        uniform float level;
		uniform float envMapFlip;

		varying vec3 vDir;

        vec4 LinearToRGBD(vec3 color) {
            float maxRGB = max(color.r, max(color.g, color.b));
            float D = max(255.0 / maxRGB, 1.);
            D = clamp(floor(D) / 255.0, 0., 1.);

			vec4 rgbd = vec4(color.rgb * D, D);

			// helps with png quantization
			// avoid color banding
			rgbd = LinearTosRGB(rgbd);

            return vec4(clamp(rgbd.rgb, 0., 1.), rgbd.a);
        }

        void main() {
            vec3 dir = normalize(vDir);
            vec3 coordVec = vec3(envMapFlip * dir.x, dir.yz);

			vec4 color;
			#ifdef TEXTURE_LOD_EXT
				color = LinearToRGBD(textureCubeLodEXT(environmentMap, coordVec, level).rgb);
			#else
				color = LinearToRGBD(textureCube(environmentMap, coordVec, level).rgb);
			#endif

            gl_FragColor = color;
        }
    `
};