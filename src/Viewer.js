import { Scene, Camera, TEXEL_ENCODING_TYPE, Vector3, PBRMaterial, DRAW_SIDE, Mesh, SphereGeometry, Object3D, BoxGeometry, Euler, Quaternion } from 't3d';
import { ForwardRenderer } from 't3d/addons/render/ForwardRenderer.js';
import { SkyBox } from 't3d/addons/objects/SkyBox.js';
import { OrbitControls } from 't3d/addons/controls/OrbitControls.js';
import { ViewControls } from 't3d/addons/controls/ViewControls.js';

export class Viewer {

	constructor(el) {
		const canvas = document.createElement('canvas');
		canvas.width = el.clientWidth * window.devicePixelRatio;
		canvas.height = el.clientHeight * window.devicePixelRatio;
		canvas.style.width = el.clientWidth + 'px';
		canvas.style.height = el.clientHeight + 'px';
		el.appendChild(canvas);

		const width = canvas.clientWidth || 2;
		const height = canvas.clientHeight || 2;

		const renderer = new ForwardRenderer(canvas);

		const scene = new Scene();

		const camera = new Camera();
		camera.outputEncoding = TEXEL_ENCODING_TYPE.GAMMA;
		camera.position.set(0, 10, 150);
		camera.lookAt(new Vector3(0, 0, 0), new Vector3(0, 1, 0));
		camera.setPerspective(45 / 180 * Math.PI, width / height, 1, 1000);
		scene.add(camera);

		const controller = new OrbitControls(camera, canvas);

		const viewControls = new ViewControls(camera, {
			target: controller.target,
			up: controller.up,
			style: 'position:fixed;bottom:0px;left:0;opacity:0.9;z-index:10000;user-select:none;',
			interactive: false
		});
		viewControls.needsUpdate = true; // fix first update
		document.body.appendChild(viewControls.domElement);

		const skyBox = new SkyBox();
		skyBox.gamma = true;
		scene.add(skyBox);

		// test objects

		const testObject = new TestObject();
		testObject.type = Types.Sphere;
		scene.add(testObject);

		//

		this._el = el;
		this._canvas = canvas;
		this._renderer = renderer;
		this._scene = scene;
		this._camera = camera;
		this._controller = controller;
		this._viewControls = viewControls;
		this._skyBox = skyBox;
		this._testObject = testObject;

		this._animationFrame = null;
		this._running = false;

		this._rotationY = 0;
		this._exposure = 1;
		this._downScale = 1;
	}

	get renderer() {
		return this._renderer;
	}

	get testObject() {
		return this._testObject;
	}

	set backgroundLevel(value) {
		this._skyBox.level = value;
	}

	get backgroundLevel() {
		return this._skyBox.level;
	}

	set envDiffuseIntensity(value) {
		this._scene.envDiffuseIntensity = value;
	}

	get envDiffuseIntensity() {
		return this._scene.envDiffuseIntensity;
	}

	set envSpecularIntensity(value) {
		this._scene.envSpecularIntensity = value;
	}

	get envSpecularIntensity() {
		return this._scene.envSpecularIntensity;
	}

	set rotationY(value) {
		this._rotationY = value;
		setRotationToAnchor(value, this._scene.anchorMatrix);
	}

	get rotationY() {
		return this._rotationY;
	}

	set exposure(value) {
		this._exposure = value;
	}

	get exposure() {
		return this._exposure;
	}

	set downScale(value) {
		this._downScale = value;
	}

	get downScale() {
		return this._downScale;
	}

	startRender() {
		const loop = timeStamp => {
			if (this._running) {
				this._animationFrame = requestAnimationFrame(loop);
				this._tick(timeStamp);
			}
		};

		this._running = true;
		this._animationFrame = requestAnimationFrame(loop);
	}

	stopRender() {
		this._running = false;

		if (this._animationFrame !== null) {
			cancelAnimationFrame(this._animationFrame);
			this._animationFrame = null;
		}
	}

	setCubeTexture(texture) {
		this._skyBox.texture = texture;
		this._scene.environment = texture;
	}

	resize() {
		const { clientHeight, clientWidth } = this._el;
		this._canvas.style.width = clientWidth + 'px';
		this._canvas.style.height = clientHeight + 'px';

		const width = this._canvas.clientWidth || 2;
		const height = this._canvas.clientHeight || 2;

		this._camera.setPerspective(45 / 180 * Math.PI, width / height, 1, 1000);

		this._renderer.backRenderTarget.resize(width, height);
	}

	_tick(timeStamp) {
		this._controller.update();
		this._viewControls.update();
		this._renderer.render(this._scene, this._camera);
	}

}

const euler = new Euler();
const quaternion = new Quaternion();
function setRotationToAnchor(rotationY, anchorMatrix) {
	euler.y = -rotationY / 180 * Math.PI;
	quaternion.setFromEuler(euler);
	quaternion.toMatrix4(anchorMatrix);
}

class TestObject extends Object3D {

	constructor() {
		super();

		const material = new PBRMaterial();
		material.diffuse.setHex(0xffffff);
		material.roughness = 0;
		material.metalness = 1;
		material.side = DRAW_SIDE.DOUBLE;

		const sphere = new Mesh(new SphereGeometry(20, 24, 16), material);
		sphere.visible = false;
		this.add(sphere);

		const box = new Mesh(new BoxGeometry(30, 30, 30), material);
		box.visible = false;
		this.add(box);

		this._type = Types.None;
		this._sphere = sphere;
		this._box = box;
		this._material = material;
	}

	set type(value) {
		this._type = value;

		this._sphere.visible = value === Types.Sphere;
		this._box.visible = value === Types.Box;
	}

	get type() {
		return this._type;
	}

	set roughness(value) {
		this._material.roughness = value;
	}

	get roughness() {
		return this._material.roughness;
	}

	set metalness(value) {
		this._material.metalness = value;
	}

	get metalness() {
		return this._material.metalness;
	}

}

const Types = {
	Sphere: 'sphere',
	Box: 'box',
	None: 'none'
};

TestObject.prototype.Types = Types;