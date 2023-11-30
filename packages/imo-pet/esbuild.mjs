import * as esbuild from "esbuild";
import path from "path";
import fs from "fs-extra";

const srcDir = "src";
const buildDir = "build";
const scriptFile = "index.js";
const scriptPath = `${srcDir}/${scriptFile}`;
const publicSrcPath = `${srcDir}/public`;
const publicDestPath = buildDir;

const htmlPlugin = {
  name: "htmlPlugin",
  setup(build) {
    const options = build.initialOptions;
    // ensure metafile is generated
    options.metafile = true;
    build.onEnd(async (result) => {
      // copy over public files
      await fs.copy(publicSrcPath, publicDestPath);
      // figure out the final output file name
      const output = {};
      Object.keys(result.metafile.outputs).forEach((file) => {
        const { entryPoint } = result.metafile.outputs[file];
        if (entryPoint) output[entryPoint] = file;
      });
      const outputFile = path.basename(output[scriptPath]);
      // generate our html file
      const index = await fs.readFile(`./${buildDir}/index.html`, {
        encoding: "utf-8",
      });
      const newIndex = index.replaceAll("${script}", outputFile);
      await fs.writeFile(`./${buildDir}/index.html`, newIndex);
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: [scriptPath],
  entryNames: "[dir]/[name]-[hash]",
  outdir: "build",
  bundle: true,
  minify: true,
  // target: ['chrome58', 'firefox57', 'safari11', 'edge16'],
  sourcemap: true,
  loader: {
    ".js": "jsx",
  },
  plugins: [htmlPlugin],
});

let { host, port } = await ctx.serve({
  servedir: buildDir,
});
console.log(`\n\nVisit: http://localhost:${port}`);

await ctx.watch();
console.log("\nWatching files for changes...");
