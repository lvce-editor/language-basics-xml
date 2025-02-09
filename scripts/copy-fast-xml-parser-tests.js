import { execaCommand } from 'execa'
import { readFile, rm, writeFile, readdir } from 'node:fs/promises'
import path, { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const REPO = 'https://github.com/NaturalIntelligence/fast-xml-parser'
const COMMIT = 'eadeb7e539758a7b85648ce42e0a6d69d1c3478b'

const getTestName = (baseName, index) => {
  return (
    'fast-xml-parser-' +
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

const parseFile = (allTests, content, filePath) => {
  const lines = content.split('\n')
  let state = 'top'
  let testLines = []
  let index = 1
  for (const line of lines) {
    const trimmedLine = line.trim()
    switch (state) {
      case 'top':
        if (trimmedLine.startsWith('const xmlData')) {
          const doubleQuoteIndex = line.indexOf('= "')
          const lastDoubleQuoteIndex = line.lastIndexOf('"')
          const backtickIndex = line.indexOf('= `')
          const lastBacktickIndex = line.lastIndexOf('`')
          if (backtickIndex !== -1) {
            if (
              lastBacktickIndex !== -1 &&
              lastBacktickIndex > backtickIndex + 2
            ) {
              testLines.push(line.slice(backtickIndex + 3, lastBacktickIndex))
              allTests.push({
                testName: getTestName(basename(filePath), index++),
                testContent: testLines.join('\n').trim() + '\n',
              })
              testLines.length = 0
            } else {
              testLines.push(line.slice(backtickIndex + 3))
              state = 'string-start'
            }
            break
          }
          if (doubleQuoteIndex !== -1) {
            testLines.push(
              line.slice(doubleQuoteIndex + 3, lastDoubleQuoteIndex),
            )
            if (line.endsWith(';')) {
              allTests.push({
                testName: getTestName(basename(filePath), index++),
                testContent: testLines.join('\n').trim() + '\n',
              })
              testLines.length = 0
            } else {
              state = 'inside-multiline-double-quote-string'
            }
            break
          }
          if (
            line.includes('fs.read') ||
            line.includes('editor.getValue') ||
            line.includes(`xmlData ="`)
          ) {
            break
          }
          throw new Error(`expected string in ${filePath}, got ${line}`)
        } else {
          // ignore
        }
        break
      case 'string-start':
        if (trimmedLine.endsWith('`;')) {
          state = 'top'
          testLines.push(line.slice(0, -2))
          allTests.push({
            testName: getTestName(basename(filePath), index++),
            testContent: testLines.join('\n').trim() + '\n',
          })
          testLines.length = 0
        } else {
          testLines.push(line)
        }
        break
      case 'inside-multiline-double-quote-string':
        if (trimmedLine.endsWith('";')) {
          state = 'top'
          const plusIndex = line.indexOf(`+ "`)
          testLines.push(line.slice(plusIndex + 3, -2))
          allTests.push({
            testName: getTestName(basename(filePath), index++),
            testContent: testLines.join('\n').trim() + '\n',
          })
          testLines.length = 0
        } else {
          testLines.push(line)
        }
      default:
        break
    }
  }
  return testLines.join('\n').trim() + '\n'
}

const getAllTests = async (folder) => {
  const specFolder = join(folder, 'spec')
  const dirents = await readdir(specFolder, { recursive: true })
  const allTests = []
  for (const dirent of dirents) {
    if (!dirent.endsWith('_spec.js')) {
      continue
    }
    const filePath = `${specFolder}/${dirent}`
    const fileContent = await readFile(filePath, 'utf8')
    if (dirent.startsWith('attr_')) {
      parseFile(allTests, fileContent, filePath)
    }
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
  await execaCommand(`git clone ${REPO} .tmp/fast-xml-parser`, {
    stdio: 'inherit',
  })
  process.chdir(`${root}/.tmp/fast-xml-parser`)
  await execaCommand(`git checkout ${COMMIT}`)
  process.chdir(root)
  const allTests = await getAllTests(`${root}/.tmp/fast-xml-parser`)
  await writeTestFiles(allTests)
}

main()
