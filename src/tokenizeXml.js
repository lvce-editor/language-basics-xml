/**
 * @enum number
 */
export const TokenType = {
  Text: 0,
  NewLine: 1,
}

export const TokenMap = {
  [TokenType.Text]: 'Text',
}

export const initialLineState = {
  state: 1,
}

export const tokenizeLine = (line, lineState) => {
  if (line.length === 0) {
    return {
      state: 1,
      tokens: [],
    }
  }
  return {
    state: 1,
    tokens: [
      {
        type: TokenType.Text,
        length: line.length,
      },
    ],
  }
}
