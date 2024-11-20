import fs from 'fs'
import path from 'path'
const scripts = fs.readdirSync('src').filter(i => /\.user\.js$/.test(i))
const SOURCE_REPLACE = '//SOURCE_CODE_REPLACE//'
scripts.forEach(jsFile => {
  const mdFile = jsFile.replace(/\.js$/, '.md')
  const jsPath = path.resolve('src', jsFile)
  const mdPath = path.resolve('src', mdFile)
  if (!fs.existsSync(jsPath) || !fs.existsSync(mdPath)) return
  const js = fs.readFileSync(jsPath).toString()
  const md = fs.readFileSync(mdPath).toString()
  fs.writeFileSync(path.resolve('doc', mdFile), md.replaceAll(SOURCE_REPLACE, js))
})
