import { tokenize } from './src/parser/lexer'

const testCode = `Button: pad $md-space $xl-space bg $primary-col rad $sm-rad`

console.log('Tokenizing:', testCode, '\n')

const tokens = tokenize(testCode)

for (const token of tokens) {
  console.log(`${token.type.padEnd(15)} | ${token.value}`)
}
