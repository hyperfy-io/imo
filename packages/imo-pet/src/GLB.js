const GLB_HEADER_LENGTH = 12;
const GLB_HEADER_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const GLB_CHUNK_PREFIX_BYTES = 8;
const GLB_CHUNK_JSON = 0x4e4f534a; // JSON
const GLB_CHUNK_BIN = 0x004e4942; // BIN

export class GLB {
  constructor() {
    this.name = null;
    this.json = null;
    this.bin = [];
  }

  fromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target.result;

        let dataView = new DataView(buffer);
        let magic = dataView.getUint32(0, true);

        if (magic !== GLB_HEADER_MAGIC) {
          return reject(new Error("Invalid magic number in GLB header."));
        }

        let version = dataView.getUint32(4, true);
        if (version !== GLB_VERSION) {
          return reject(new Error("Unsupported GLB version."));
        }

        this.name = file.name;
        this.json = null;
        this.bin = [];

        let index = GLB_HEADER_LENGTH;
        while (index < buffer.byteLength) {
          const chunkLength = dataView.getUint32(index, true);
          index += 4;
          const chunkType = dataView.getUint32(index, true);
          index += 4;

          const chunkBuffer = new Uint8Array(buffer, index, chunkLength);
          if (chunkType === GLB_CHUNK_JSON) {
            const jsonString = new TextDecoder().decode(chunkBuffer);
            this.json = JSON.parse(jsonString);
          } else {
            this.bin.push({
              length: chunkLength,
              type: chunkType,
              buffer: chunkBuffer,
            });
          }
          index += chunkLength;
        }
        resolve();
      };
      reader.readAsArrayBuffer(file);
    });
  }

  toFile() {
    // JSON chunk
    const json = new TextEncoder().encode(JSON.stringify(this.json)).buffer;
    const jsonChunk = pad(json, 0x20);
    const jsonChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES)) // prettier-ignore
    jsonChunkPrefix.setUint32(0, jsonChunk.byteLength, true);
    jsonChunkPrefix.setUint32(4, GLB_CHUNK_JSON, true);

    // Binary chunks
    const binChunks = [];
    for (const bin of this.bin) {
      const binaryChunk = pad(bin.buffer);
      const binaryChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES)) // prettier-ignore
      binaryChunkPrefix.setUint32(0, binaryChunk.byteLength, true);
      binaryChunkPrefix.setUint32(4, bin.type, true);
      binChunks.push({ binaryChunk, binaryChunkPrefix });
    }

    // Header chunk
    const header = new ArrayBuffer(GLB_HEADER_LENGTH);
    const headerView = new DataView(header);
    headerView.setUint32(0, GLB_HEADER_MAGIC, true);
    headerView.setUint32(4, GLB_VERSION, true);
    let totalByteLength = 0;
    totalByteLength += GLB_HEADER_LENGTH;
    totalByteLength += jsonChunkPrefix.byteLength + jsonChunk.byteLength;
    for (const c of binChunks) {
      totalByteLength +=
        c.binaryChunkPrefix.byteLength + c.binaryChunk.byteLength;
    }
    headerView.setUint32(8, totalByteLength, true);

    const bufs = [header, jsonChunkPrefix, jsonChunk];
    for (const c of binChunks) {
      bufs.push(c.binaryChunkPrefix);
      bufs.push(c.binaryChunk);
    }

    const blob = new Blob(bufs, { type: "model/gltf-binary" });
    const file = new File([blob], this.name, {
      type: "model/gltf-binary",
    });

    return file;
  }
}

function padNum(bufferSize) {
  return Math.ceil(bufferSize / 4) * 4;
}

function pad(arrayBuffer, paddingByte = 0) {
  const paddedLength = padNum(arrayBuffer.byteLength);
  if (paddedLength !== arrayBuffer.byteLength) {
    const array = new Uint8Array(paddedLength);
    array.set(new Uint8Array(arrayBuffer));
    if (paddingByte !== 0) {
      for (let i = arrayBuffer.byteLength; i < paddedLength; i++) {
        array[i] = paddingByte;
      }
    }
    return array.buffer;
  }
  return arrayBuffer;
}
