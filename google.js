const async = require('async');
const EventEmitter = require('events');
const axios = require('axios');
const { JSDOM } = require('jsdom');

module.exports = class Google extends EventEmitter {
  constructor() {
    super();
    this.interval = 1000;
    this.cookies = new CookieList();
  }

  choiceUserAgent() {
    return 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko';
  }

  search(keywords, maxCount=10) {
    const queue = async.queue((keyword, callback) => {
      // generate url
      const url = new URL('https://www.google.com/search');
      if (keyword.isGenuin() && maxCount > 10) {
        url.searchParams.append('num', maxCount);
      }
      Object.entries({ hl: 'ja', source: 'hp', biw: '', bih: '', q: keyword.toString() })
        .forEach(([key, value]) => url.searchParams.append(key, value));

      // request config
      const config = {
        headers: {
          'User-Agent': this.choiceUserAgent(),
          'Accept-Language': 'ja-JP',
          'Connection': 'Close',
          'Cookie': makeCookieString(this.cookies),
        },
        transformResponse: [this.parseResult],
      };


      axios.get(url.toString(), config)
      .then(res => {
        if (keyword.isGenuin()) {
          res.data.forEach(r => r.keyword = keyword.toString());
          this.emit('data', res.data);
        }
        const resultCookies = new CookieList(...res.headers['set-cookie'].map(x => parseCookieString(x.trim())));
        this.cookies = this.cookies.filter(a => !resultCookies.some(b => a.equals(b))).concat(resultCookies);
        setTimeout(callback, this.interval + Math.floor(Math.random() * 2000));
      })
      .catch(err => {
        if (err.response != null && err.response.status == 429) {
          console.log('429...');
          this.emit('error', { keyword, url, config });
        } else {
          console.error(JSON.stringify({ keyword, url, config }));
          this.emit('error', err);
        }
      });
    }, 1);
    queue.drain(() => {
      this.emit('end');
    });
    queue.error(err => {
      this.emit('error', err);
    });
    for (const keyword of GoogleSearchKeyword.shuffle(keywords)) {
      queue.push(keyword);
    }
  }

  parseResult(data, _headers) {
    const dom = new JSDOM(data);
    return Array.from(dom.window.document.getElementsByClassName('g'))
      .map(GoogleSerpsRecord.factory)
      .filter(item => item != null);
  }
}

function makeCookieString(cookies) {
  const tmp = {};
  cookies
    .sort((a, b) => a.meta.path.length - b.meta.path.length)
    .forEach(c => { tmp[c.name] = c.value || ''; });
  return Object.entries(tmp).map(x => x.join('=')).join('; ');
}

function parseCookieString(cookieStr) {
  const elements = cookieStr.split(';').map(x => x.trim());
  const first = elements.shift();
  const first_idx = first.indexOf('=');
  const result = new CookieElement(first.substr(0, first_idx), first.substr(first_idx + 1));
  for (let e of elements) {
    const idx = e.indexOf('=');
    if (idx < 0) {
      result.meta[e] = undefined;
    } else {
      result.meta[e.substr(0, idx)] = e.substr(idx+1);
    }
  }
  return result;
}

function generateRandomString() {
  const candidates = ['wsekf', 'wlthn', 'nufxh', 'ycywg', 'lbdql', 'lphjm', 'cyuwj', 'xnrhr', 'zmbxz', 'jtozk'];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getShuffleKeyword(keyword) {
  if (!/\s/.test(keyword)) return generateRandomString();
  const tmp = keyword.split(/\s/g);
  tmp.sort(() => Math.random() - .5);
  tmp.shift();
  return tmp.join(' ');
}

class CookieList {
  constructor(...initialElements) {
    this.elements = initialElements;
  }

  some() {
    return this.elements.some.apply(this.elements, arguments);
  }

  sort() {
    return new CookieList(...this.elements.sort.apply(this.elements, arguments));
  }

  forEach(callback) {
    this.elements.forEach(callback);
  }

  filter() {
    return new CookieList(...this.elements.filter.apply(this.elements, arguments));
  }

  map() {
    return new CookieList(...this.elements.map.apply(this.elements, arguments));
  }

  splice() {
    return new CookieList(...this.elements.splice.apply(this.elements, arguments));
  }

  concat(...values) {
    return new CookieList(...this.elements.concat(...values.map(x => x.elements)));
  }

  push(key, value) {
    const c = new CookieElement(key, value);
    c.meta.path = '/';
    this.elements.push(c);
  }
}

class CookieElement {
  constructor(name, value) {
    this.name = name;
    this.value = value;
    this.meta = {};
  }

  check(url) {
    return url.pathname.includes(this.meta.path);
  }

  equals(other) {
    return this.name === other.name && this.meta.path === other.meta.path;
  }

  toString() {
    return `${this.name}=${this.value}`;
  }
}

class GoogleSearchKeyword {
  constructor(keyword) {
    this.keyword = keyword;
  }

  isGenuin() {
    return true;
  }

  toString() {
    return this.keyword;
  }

  static shuffle(keywords) {
    const methods = [
      generateRandomString,
      getShuffleKeyword,
    ];
    const kwObjects = keywords.map(kw => new GoogleSearchKeyword(kw));
    const dummies = keywords.map(kw => new GoogleSearchDummyKeyword(methods[Math.floor(Math.random() * methods.length)](kw)));
    kwObjects.sort(() => Math.random() - .5);
    dummies.sort(() => Math.random() - .5);
    const tmp = [];
    for (let i = 0; i < keywords.length; i++) {
      tmp.push(kwObjects[i]);
      tmp.push(dummies[i]);
    }
    return tmp;
  }
}

class GoogleSearchDummyKeyword extends GoogleSearchKeyword {
  constructor(keyword) {
    super(keyword);
    this.keyword = keyword;
  }

  isGenuin() {
    return false;
  }
}

class GoogleSerpsRecord {
  constructor() {
    this.keyword = '';
    this.title = '';
    this.url = '';
  }

  static factory(element) {
    if (element == null) return null;

    const organic = GoogleSerpsRecord.parseAsOrganic(element);
    if (organic != null) return organic;
    return null;
  }

  static parseAsOrganic(element) {
    const e = element.querySelector('.LC20lb');
    if (e == null) return null;
    const result = new GoogleSerpsRecord();
    result.title = e.textContent;
    result.url = new URL(e.parentElement.href);
    return result;
  }
}
