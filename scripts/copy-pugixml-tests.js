import { execaCommand } from 'execa'
import { readFile, rm, writeFile, readdir } from 'node:fs/promises'
import path, { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const REPO = 'https://github.com/zeux/pugixml'
const COMMIT = 'a305d01bc8dd3f3708c4ee80be8c87dfb51e13ad'

const getTestName = (baseName, index) => {
  return (
    'pugixml-parser-' +
    baseName
      .toLowerCase()
      .trim()
      .replaceAll(' ', '-')
      .replaceAll('/', '-')
      .replaceAll(',', '')
      .replaceAll('_', '-')
      .replaceAll('-spec.js', `-${index}.xml`)
  )
}

const getAllTests = async (folder) => {
  const specFolder = join(folder, 'tests')
  const dirents = await readdir(specFolder, { recursive: true })
  const allTests = []
  for (const dirent of dirents) {
    if (!dirent.endsWith('.xml')) {
      continue
    }
    const filePath = `${specFolder}/${dirent}`
    const fileContent = await readFile(filePath, 'utf8')
    if (dirent.includes('utf16')) {
      continue
    }
    if (dirent.includes('utf32')) {
      continue
    }
    if (dirent.includes('empty')) {
      continue
    }
    allTests.push({
      testName: getTestName(dirent),
      testContent: fileContent,
    })
  }
  return allTests
}

const writeTestFiles = async (allTests) => {
  for (const test of allTests) {
    await writeFile(`${root}/test/cases/${test.testName}`, test.testContent)
  }
}

const main = async () => {
  process.chdir(root)
  await rm(`${root}/.tmp`, { recursive: true, force: true })
  await execaCommand(`git clone ${REPO} .tmp/pugixml`, {
    stdio: 'inherit',
  })
  process.chdir(`${root}/.tmp/pugixml`)
  await execaCommand(`git checkout ${COMMIT}`)
  process.chdir(root)
  const allTests = await getAllTests(`${root}/.tmp/pugixml`)
  await writeTestFiles(allTests)
}

main()
