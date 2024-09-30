import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

export class UIControl {

	constructor(app) {
		const pane = new Pane();
		pane.registerPlugin(EssentialsPlugin);

		const { viewer, envExporter, hdrExporter } = app;

		// Preview

		const previewFolder = pane.addFolder({ title: 'Preview' });
		previewFolder.addBinding(viewer, 'backgroundLevel', {
			label: 'SkyRoughness',
			min: 0,
			max: 10,
			step: 0.1
		});

		const environmentFolder = previewFolder.addFolder({ title: 'Environment Intensity', expanded: false });
		environmentFolder.addBinding(viewer, 'envDiffuseIntensity', {
			label: 'Diffuse',
			min: 0,
			max: 2,
			step: 0.1
		});
		environmentFolder.addBinding(viewer, 'envSpecularIntensity', {
			label: 'Specular',
			min: 0,
			max: 2,
			step: 0.1
		});

		const reflectionFolder = previewFolder.addFolder({ title: 'Reflective Object', expanded: false });

		const types = ['None', 'Sphere', 'Box'];
		reflectionFolder.addBinding(viewer.testObject, 'type', {
			label: 'Type',
			view: 'radiogrid',
			groupName: 'type',
			size: [3, 1],
			cells: x => ({
				title: types[x],
				value: viewer.testObject.Types[types[x]]
			})
		});
		reflectionFolder.addBinding(viewer.testObject, 'roughness', {
			label: 'Roughness',
			min: 0,
			max: 1,
			step: 0.01
		});
		reflectionFolder.addBinding(viewer.testObject, 'metalness', {
			label: 'Metalness',
			min: 0,
			max: 1,
			step: 0.01
		});

		// Export

		const exportFolder = pane.addFolder({ title: 'Export' });

		const optionsFolder = exportFolder.addFolder({ title: 'Options' });
		optionsFolder.addBinding(viewer, 'rotationY', {
			label: 'RotationY',
			min: 0,
			max: 360
		});
		optionsFolder.addBinding(viewer, 'exposure', {
			label: 'Exposure',
			min: 0,
			max: 10,
			disabled: true
		});
		optionsFolder.addBinding(viewer, 'downScale', {
			label: 'DownScale',
			min: 1,
			max: 8,
			step: 1,
			disabled: true
		});

		exportFolder.addButton({ title: 'Env' }).on('click', async () => {
			const buffer = await envExporter.toBuffer(viewer);
			loadFile(buffer, 'env');
		});
		exportFolder.addButton({ title: 'HDR' }).on('click', () => {
			const buffer = hdrExporter.toBuffer(viewer);
			loadFile(buffer, 'hdr');
		});
		exportFolder.addButton({ title: 'DDS (coming soon)', disabled: true });

		//

		this._exportOptionsFolder = optionsFolder;
	}

	refreshExportOptions() {
		this._exportOptionsFolder.refresh();
	}

}

function loadFile(buffer, type) {
	const file = new Blob([buffer], { type: 'octet/stream' });
	const event = new MouseEvent('click');
	const link = document.createElement('a');

	link.download = `environment.${type}`;
	link.href = URL.createObjectURL(file);
	link.dataset.downloadurl = ['application/octet-stream', link.download, link.href].join(':');
	link.dispatchEvent(event);

	URL.revokeObjectURL(link.href);
}