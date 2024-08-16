# t3d-ibl-baker

This is a simple tool to bake IBL maps for [t3d.js](https://github.com/uinosoft/t3d.js).

[Visit online](https://uinosoft.github.io/t3d-ibl-baker/)

## Features

* Bake IBL maps from HDR and LDR images.
* Adjust the Y-axis rotation of IBL maps.
* Adjust the exposure of IBL maps. (coming soon)
* Export to `.env` file, optimized for `t3d.js` with smaller size and faster loading speed.
* Export to `.dds` file. (coming soon)
* Export to `.hdr` file. (coming soon)

## ENV Format

The `.env` file is used to store baked IBL maps and can be loaded by `t3d.js`.

You can find the EnvLoader here: [EnvLoader](https://github.com/uinosoft/t3d.js/blob/dev/examples/jsm/loaders/EnvLoader.js).

### Format of the `.env` File (v1)

The `.env` File consists of three parts: `Header`, `Json Data`, and `Buffer Data`.

#### Header

The header of the `.env` File contains the following fields:

- **version**(4 bytes): The version of the `.env` File.
- **jsonByteLength**(4 bytes): The byte length of the Json Data.

Header's total length is 8 bytes.

#### Json Data

The Json Data is a JSON object containing the following fields:

- **generator**: The name of the generator.
- **imageSize**: The size of the IBL map at level 0.
- **mipmaps**: An array of mipmap information. The order is as follows: `level0-posx`, `level0-negx`, ..., `levelN-negz`. Each element contains:
  - **length**: The byte length of the current mipmap.
  - **position**: The byte position of the current mipmap, relative to the beginning of the body.

#### Buffer Data

The Buffer Data is binary data containing all mipmap data.

## TODOs:

* [ ] Export spherical harmonics.
* [ ] Encoding type selection.
* [ ] Support explosure editing.
* [ ] Add DDS export.
* [ ] Add HDR export.