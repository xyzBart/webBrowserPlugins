import esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', 'node:*', '@codemirror/*', '@lezer/*'],
  format: 'cjs',
  platform: 'node',
  outfile: 'main.js',
  sourcemap: 'inline',
  treeShaking: true,
  logLevel: 'info',
});

if (isWatch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
