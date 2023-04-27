import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  entries: [
    {
      input: './src/',
      outDir: './dist/esm',
      format: 'esm',
      ext: 'js',
      declaration: true
    },
    {
      input: './src/',
      outDir: './dist/cjs',
      format: 'cjs',
      ext: 'js'
    }
  ]
})
