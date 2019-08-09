import React from 'react';
import ReactDOM from 'react-dom';

import './github-markdown.css';

interface Data {
  abbreviation: string
  derivation: string
  example: string
  explanation: string
  pinyin: string
  word: string
  level?: number
}

interface State {
  firstPinyin: {
    [key: string]: Data[]
  }
  lastPinyin: {
    [key: string]: Data[]
  }
  word: {
    [key: string]: Data
  }
  error?: string
}

const getFirstPinyin = (pinyin: string) => {
  return pinyin.normalize('NFKD').replace(/[^\w\s]|\s.+/g, '')
}

const getLastPinyin = (pinyin: string) => {
  return pinyin.normalize('NFKD').replace(/[^\w\s]|.+\s/g, '')
}

const indexed = (json: Data[]) => {
  const result: State = { firstPinyin: {}, lastPinyin: {}, word: {} }
  for (const data of json) {
    if (data.word.length === 4) {
      const key1 = getLastPinyin(data.pinyin)
      const values1 = result.lastPinyin[key1] || []
      result.lastPinyin[key1] = values1
      values1.push(data)

      const key2 = getFirstPinyin(data.pinyin)
      const values2 = result.firstPinyin[key2] || []
      result.firstPinyin[key2] = values2
      values2.push(data)

      result.word[data.word] = data
    }
  }
  let pinyins = new Set(['yi'])
  for (let level = 1; pinyins.size > 0; ++level) {
    const newpinyins = new Set<string>()
    pinyins.forEach(pinyin => {
      for (const data of result.lastPinyin[pinyin] || []) {
        if (!data.level) {
          data.level = level
          newpinyins.add(getFirstPinyin(data.pinyin))
        }
      }
    })
    console.log(`Generate ${newpinyins.size} entries for level ${level}`)
    pinyins = newpinyins
  }
  return result
}

const handle = (input: string, state: State) => {
  const result: string[] = []
  let data = state.word[input]
  while (data && data.level) {
    const level = data.level
    result.push(`${data.word}（${data.pinyin}）`)
    if (level > 1) {
      const next = state.firstPinyin[getLastPinyin(data.pinyin)]
      const filtered = next.filter(d => d.level && d.level < level)
      data = filtered[Math.floor(Math.random() * filtered.length)]
    } else {
      result.push('一个顶俩（yī gè dǐng liǎ）')
      return result
    }
  }
  return result
}

function App() {
  const [state, setState] = React.useState<State>({ firstPinyin: {}, lastPinyin: {}, word: {} })
  const [seq, setSeq] = React.useState<string[]>([])

  if (Object.keys(state.word).length > 0) {
    return <div className='markdown-body'>
      <h1>一个顶俩</h1>
      <p>请输入一个四字成语，如成功识别：</p>
      <p>本页面将自动为你接龙到“一个顶俩”</p>
      <p><input type='input' onChange={e => setSeq(handle(e.target.value, state))} /></p>
      <ul>{seq.map(data => {
        return <li key={data}>{data}</li>
      })}</ul>
      <p>网页来源：<a href='https://github.com/ustc-zzzz/yigedinglia'>https://github.com/ustc-zzzz/yigedinglia</a></p>
      <p>数据来源：<a href='https://github.com/pwxcoo/chinese-xinhua'>https://github.com/pwxcoo/chinese-xinhua</a></p>
    </div>
  } else if (state.error) {
    return <div className='markdown-body'>
      <h1>一个顶俩</h1>
      <p style={{color: 'red'}}>{`数据加载中...加载异常，请刷新重试：${state.error}`}</p>
      <p>网页来源：<a href='https://github.com/ustc-zzzz/yigedinglia'>https://github.com/ustc-zzzz/yigedinglia</a></p>
      <p>数据来源：<a href='https://github.com/pwxcoo/chinese-xinhua'>https://github.com/pwxcoo/chinese-xinhua</a></p>
    </div>
  } else {
    const base = 'https://raw.githubusercontent.com'
    const url = `${base}/pwxcoo/chinese-xinhua/master/data/idiom.json`
    fetch(url).then(res => res.json()).then(json => setState(indexed(json))).catch(error => setState({...state, error}))
    return <div className='markdown-body'>
      <h1>一个顶俩</h1>
      <p>数据加载中...</p>
      <p>网页来源：<a href='https://github.com/ustc-zzzz/yigedinglia'>https://github.com/ustc-zzzz/yigedinglia</a></p>
      <p>数据来源：<a href='https://github.com/pwxcoo/chinese-xinhua'>https://github.com/pwxcoo/chinese-xinhua</a></p>
    </div>
  }
}

ReactDOM.render(<App />, document.getElementsByTagName('main')[0])
