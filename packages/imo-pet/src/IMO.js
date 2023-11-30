import { defaultsDeep } from "lodash";

import { stringToHex } from "./utils";

const EXT_IMO = "EXT_imo";
const GLB_CHUNK_IMO = stringToHex("IMO");

export class IMO {
  constructor(defaultSpec) {
    this.defaultSpec = defaultSpec;
    this.glb = null;
    this.spec = {};
    this.assets = [];
  }

  fromGlb(glb) {
    this.glb = glb;
    if (glb.json?.extensions?.IMO) {
      this.spec = defaultsDeep(glb.json.extensions.IMO.spec, this.defaultSpec);
      this.assets = [];
      const bin = glb.bin.find((bin) => bin.type === GLB_CHUNK_IMO);
      for (const asset of glb.json.extensions.IMO.assets) {
        const buffer = new Uint8Array(
          bin.buffer.subarray(
            asset.byteOffset,
            asset.byteOffset + asset.byteLength
          )
        );
        this.assets.push({
          name: asset.name,
          buffer,
        });
      }
    } else {
      this.spec = defaultsDeep({}, this.defaultSpec);
      this.assets = [];
    }
    return this;
  }

  toFile() {
    // BIN
    let bin = this.glb.bin.find((bin) => bin.type === GLB_CHUNK_IMO);
    if (!bin) {
      bin = {
        length: 0,
        type: GLB_CHUNK_IMO,
        buffer: null,
      };
      this.glb.bin.push(bin);
    }
    bin.length = 0;
    for (const asset of this.assets) {
      bin.length += asset.buffer.byteLength;
    }
    bin.length = padNum(bin.length);
    bin.buffer = new ArrayBuffer(bin.length);
    const binView = new Uint8Array(bin.buffer);
    let offset = 0;
    const assets = [];
    for (const asset of this.assets) {
      assets.push({
        name: asset.name,
        byteOffset: offset,
        byteLength: asset.buffer.byteLength,
      });
      binView.set(asset.buffer, offset);
      offset += asset.buffer.byteLength;
    }

    // JSON
    if (!this.glb.json.extensions) {
      this.glb.json.extensions = {};
    }
    this.glb.json.extensions.IMO = {
      spec: this.spec,
      assets,
    };
    if (!this.glb.json.extensionsUsed) {
      this.glb.json.extensionsUsed = [];
    }
    if (!this.glb.json.extensionsUsed.includes(EXT_IMO)) {
      this.glb.json.extensionsUsed.push(EXT_IMO);
    }

    const file = this.glb.toFile();
    return file;
  }

  isValid() {
    return false;
  }
}

function padNum(bufferSize) {
  return Math.ceil(bufferSize / 4) * 4;
}
