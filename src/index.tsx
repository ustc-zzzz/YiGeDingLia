import React from 'react'
import ReactDOM from 'react-dom'
import * as Clipboard from 'clipboard-polyfill'

import './index.css'
import './github-markdown.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

type ErrorMsg = string

type Idiom = {
  word: string,
  pinyin: string,
}

type Data = Idiom & {
  abbreviation: string
  derivation: string
  example: string
  explanation: string
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
}

const getFirstPinyin = (data: Data) => {
  return (data.pinyin.split(/\s+/).shift() || '')
    .replace(/[āáǎà]/g, 'a').replace(/[ōóǒò]/g, 'o').replace(/[ēéěèê]/g, 'e')
    .replace(/[īíǐì]/g, 'i').replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜü]/g, 'v')
}

const getLastPinyin = (data: Data) => {
  return (data.pinyin.split(/\s+/).pop() || '')
    .replace(/[āáǎà]/g, 'a').replace(/[ōóǒò]/g, 'o').replace(/[ēéěèê]/g, 'e')
    .replace(/[īíǐì]/g, 'i').replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜü]/g, 'v')
}

const fix = (data: Data) => {
  if ('味同嚼蜡' === data.word) {
    data.pinyin = data.pinyin.replace('cù', 'là')
  }
  if (data.word.endsWith('俩')) {
    data.pinyin = data.pinyin.replace('liǎng', 'liǎ')
  }
  data.pinyin = data.pinyin.replace(/yi([ēéěèêe])/g, 'y$1')
  return data
}

const indexed = (json: Data[]) => {
  const result: State = { firstPinyin: {}, lastPinyin: {}, word: {} }
  for (const data of json) {
    fix(data)
    if (data.word.length === 4) {
      const key1 = getLastPinyin(data)
      const values1 = result.lastPinyin[key1] || []
      result.lastPinyin[key1] = values1
      values1.push(data)

      const key2 = getFirstPinyin(data)
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
          newpinyins.add(getFirstPinyin(data))
        }
      }
    })
    console.log(`Generate ${newpinyins.size} entries for level ${level}`)
    pinyins = newpinyins
  }
  return result
}


const handle = (input: string, state: State) => {
  const result: Idiom[] = []
  let data = state.word[input]
  while (data && data.level) {
    const level = data.level
    result.push(data)
    if (level > 1) {
      const next = state.firstPinyin[getLastPinyin(data)]
      const filtered = next.filter(d => d.level && d.level < level)
      data = filtered[Math.floor(Math.random() * filtered.length)]
    } else {
      result.push({ word: '一个顶俩', pinyin: 'yī gè dǐng liǎ' })
      return result
    }
  }
  return result
}

function fetchJson(resolve: (data: State) => void, reject: (error: ErrorMsg) => void) {
  const url = 'https://cdn.jsdelivr.net/gh/pwxcoo/chinese-xinhua/data/idiom.json'
  fetch(url).then(r => r.json()).then(j => resolve(indexed(j))).catch(e => reject('' + e))
}

function copyText(text: string) {
  return () => {
    const dt = new Clipboard.DT()
    dt.setData('text/plain', text)
    Clipboard.write(dt)
  }
}

function Loading(props: { error: ErrorMsg }) {
  if (props.error === '') {
    return <p>数据加载中...</p>
  } else {
    return <p style={{ color: 'red' }}>{`数据加载中...加载异常，请刷新重试：${props.error}`}</p>
  }
}

function Input(props: { onChange(value: string): void }) {
  return <div>
    <p>请输入一个四字成语，<wbr />如成功识别：</p>
    <p>本页面将自动为你<wbr />接龙到“一个顶俩”</p>
    <p><input type='input' onChange={e => props.onChange(e.target.value)} /></p>
  </div>
}

function Output(props: { copyText(word: string): () => void, seq: Idiom[] }) {
  if (props.seq.length > 0) {
    return <div>
      <p>点击成语可以直接复制：</p>
      <ul>{props.seq.map(data => {
        return <li className='clickable' onClick={copyText(data.word)} key={data.word}>
          {data.word}（{data.pinyin}）
        </li>
      })}</ul>
    </div>
  } else {
    return <div>
      <p>没有输出？<wbr />情况可能是以下两种之一：</p>
      <ul>
        <li>不是四字成语，<wbr />或成语在词库中不存在</li>
        <li>成语存在，<wbr />但是无法接龙到“一个顶俩”</li>
      </ul>
    </div>
  }
}

function Footer() {
  return <div>
    <p>
      网页来源：<wbr />
      <a href='https://github.com/ustc-zzzz/yigedinglia'>ustc-zzzz/yigedinglia</a>
    </p>
    <p>
      数据来源：<wbr />
      <a href='https://github.com/pwxcoo/chinese-xinhua'>pwxcoo/chinese-xinhua</a>
    </p>
  </div>
}

function App() {
  const [state, setState] = React.useState<State>({ firstPinyin: {}, lastPinyin: {}, word: {} })
  const [error, setError] = React.useState<ErrorMsg>('')
  const [seq, setSeq] = React.useState<Idiom[]>([])

  if (Object.keys(state.word).length > 0) {
    return <div className='markdown-body'>
      <h1>一个顶俩</h1>
      <Input onChange={value => setSeq(handle(value, state))} />
      <Output seq={seq} copyText={copyText} />
      <Footer />
    </div>
  } else {
    fetchJson(setState, setError)
    return <div className='markdown-body'>
      <h1>一个顶俩</h1>
      <Loading error={error} />
      <Footer />
    </div>
  }
}

ReactDOM.render(<App />, document.getElementsByTagName('main')[0])
