import fs from 'fs'
import path from 'path'
const scripts = fs.readdirSync('src').filter(i => /\.user\.js$/.test(i))
const SOURCE_REPLACE = '//SOURCE_CODE_REPLACE//'
if (!fs.existsSync(path.resolve('doc'))) fs.mkdirSync(path.resolve('doc'), { recursive: true })
scripts.forEach(jsFile => {
  const mdFile = jsFile.replace(/\.js$/, '.md')
  const gfFile = jsFile.replace(/\.js$/, '.gf.md')
  const pjFile = jsFile.replace(/\.js$/, '.52.md')
  const jsPath = path.resolve('src', jsFile)
  const mdPath = path.resolve('src', mdFile)
  if (!fs.existsSync(jsPath) || !fs.existsSync(mdPath)) return
  const js = fs.readFileSync(jsPath).toString()
  const md = fs.readFileSync(mdPath).toString().replaceAll('木头人丶 123','木头人丶123')
  const gfMd = md.replace(/\n#+\s*源代码(.*\n)*/, '').replace(/\n.*?\[源代码\]\(#源代码\).*\n/, '')
  const pjMd = md
    .replaceAll(SOURCE_REPLACE, js)
    .replace(/\n> 参与讨论请前往.+?\n/, '')
    .replaceAll('[源代码](#源代码)', '本贴提供的源代码')
  fs.writeFileSync(path.resolve('doc', gfFile), gfMd)
  fs.writeFileSync(path.resolve('doc', pjFile), pjMd)
})
