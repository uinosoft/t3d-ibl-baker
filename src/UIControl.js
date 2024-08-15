import { GUI } from 'lil-gui';

export class UIControl {

	constructor(app) {
		const gui = new GUI({ title: 'Options' });

		const { viewer, envExporter } = app;

		const previewFolder = gui.addFolder('Preview');
		previewFolder.add(viewer, 'backgroundLevel', 0, 10, 0.1).name('Background Level');

		const environmentFolder = previewFolder.addFolder('Environment').close();
		environmentFolder.add(viewer, 'envDiffuseIntensity', 0, 2, 0.1).name('Environment Diffuse');
		environmentFolder.add(viewer, 'envSpecularIntensity', 0, 2, 0.1).name('Environment Specular');

		const testObjectFolder = previewFolder.addFolder('Test Object').close();
		testObjectFolder.add(viewer.testObject, 'type', viewer.testObject.Types).name('Type');
		testObjectFolder.add(viewer.testObject, 'roughness', 0, 1, 0.01).name('Roughness');
		testObjectFolder.add(viewer.testObject, 'metalness', 0, 1, 0.01).name('Metalness');

		const exportFunctions = {
			'env': async () => {
				const buffer = await envExporter.toBuffer(viewer);
				loadEnvFile(buffer);
			},
			'hdr': () => {},
			'dds': () => {}
		};

		const exportFolder = gui.addFolder('Export');
		exportFolder.add(viewer, 'rotationY', 0, 360).name('Rotation Y').listen();
		exportFolder.add(viewer, 'exposure', 0, 10).name('Exposure').disable();
		exportFolder.add(exportFunctions, 'env').name('Env');
		exportFolder.add(exportFunctions, 'dds').name('DDS (coming soon)').disable();
		exportFolder.add(exportFunctions, 'hdr').name('HDR (coming soon)').disable();

		this._gui = gui;
	}

}

function loadEnvFile(buffer) {
	const file = new Blob([buffer], { type: 'octet/stream' });
	const event = new MouseEvent('click');
	const link = document.createElement('a');

	link.download = 'environment.env';
	link.href = URL.createObjectURL(file);
	link.dataset.downloadurl = ['application/octet-stream', link.download, link.href].join(':');
	link.dispatchEvent(event);

	URL.revokeObjectURL(link.href);
}