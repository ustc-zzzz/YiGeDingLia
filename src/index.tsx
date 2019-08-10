import React from 'react';
import ReactDOM from 'react-dom';
import * as clipboard from "clipboard-polyfill";

import './index.css';
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
  return data;
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

type Idiom = {
  word: string,
  pinyin: string,
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

function copyText(text: string) {
  return () => {
    const dt = new clipboard.DT();
    dt.setData("text/plain", text);
    clipboard.write(dt);
  }
}

function App() {
  const [state, setState] = React.useState<State>({ firstPinyin: {}, lastPinyin: {}, word: {} })
  const [seq, setSeq] = React.useState<Idiom[]>([])

  if (Object.keys(state.word).length > 0) {
    return <div className='markdown-body'>
      <h1>一个顶俩</h1>
      <p>请输入一个四字成语，如成功识别：</p>
      <p>本页面将自动为你接龙到“一个顶俩”</p>
      <p><input type='input' onChange={e => setSeq(handle(e.target.value, state))} /></p>
      <ul>{seq.map(data => {
        return <li onClick={copyText(data.word)} key={data.word}>{data.word}（{data.pinyin}）</li>
      })}</ul>
      <p>网页来源：<a href='https://github.com/ustc-zzzz/yigedinglia'>ustc-zzzz/yigedinglia</a></p>
      <p>数据来源：<a href='https://github.com/pwxcoo/chinese-xinhua'>pwxcoo/chinese-xinhua</a></p>
    </div>
  } else if (state.error) {
    return <div className='markdown-body'>
      <h1>一个顶俩</h1>
      <p style={{ color: 'red' }}>{`数据加载中...加载异常，请刷新重试：${state.error}`}</p>
      <p>网页来源：<a href='https://github.com/ustc-zzzz/yigedinglia'>ustc-zzzz/yigedinglia</a></p>
      <p>数据来源：<a href='https://github.com/pwxcoo/chinese-xinhua'>pwxcoo/chinese-xinhua</a></p>
    </div>
  } else {
    const url = 'https://cdn.jsdelivr.net/gh/pwxcoo/chinese-xinhua/data/idiom.json'
    fetch(url).then(res => res.json()).then(json => setState(indexed(json))).catch(error => setState({ ...state, error }))
    return <div className='markdown-body'>
      <h1>一个顶俩</h1>
      <p>数据加载中...</p>
      <p>网页来源：<a href='https://github.com/ustc-zzzz/yigedinglia'>ustc-zzzz/yigedinglia</a></p>
      <p>数据来源：<a href='https://github.com/pwxcoo/chinese-xinhua'>pwxcoo/chinese-xinhua</a></p>
    </div>
  }
}

ReactDOM.render(<App />, document.getElementsByTagName('main')[0])
