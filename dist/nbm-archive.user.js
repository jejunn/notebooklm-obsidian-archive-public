// ==UserScript==
// @name         nbm-archive
// @version      0.1.5
// @description  Archive one NotebookLM conversation into an Obsidian vault note
// @match        https://notebook.google.com/*
// @inject-into  content
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==
/* markdown-it 14.3.2 MIT license
Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin.

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
// Choose course, lecture, and first/review mode in the archive dialog.
// The notebook URL supplies its ID; confirm the recent conversation candidate.
// Uncheck validation-only in the dialog to save to Obsidian.
// CONFIG starts at line 4693 of the bundle below.
// ---------------------------------------------------------------------------
(() => {
  var __create = Object.create;
  var __getProtoOf = Object.getPrototypeOf;
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toESMCache_node;
  var __toESMCache_esm;
  var __toESM = (mod, isNodeMode, target) => {
    var canCache = mod != null && typeof mod === "object";
    if (canCache) {
      var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
      var cached = cache.get(mod);
      if (cached)
        return cached;
    }
    target = mod != null ? __create(__getProtoOf(mod)) : {};
    const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
    if (mod && typeof mod === "object" || typeof mod === "function") {
      for (let key of __getOwnPropNames(mod))
        if (!__hasOwnProp.call(to, key))
          __defProp(to, key, {
            get: __accessProp.bind(mod, key),
            enumerable: true
          });
    }
    if (canCache)
      cache.set(mod, to);
    return to;
  };
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // src/vendor/markdown-it/markdown-it.cjs
  var require_markdown_it = __commonJS(function(exports, module) {
    /*! markdown-it 14.3.2 https://github.com/markdown-it/markdown-it @license MIT */
    (function(t, e) {
      typeof exports == "object" && typeof module != "undefined" ? module.exports = e() : typeof define == "function" && define.amd ? define([], e) : (t = typeof globalThis != "undefined" ? globalThis : t || self).markdownit = e();
    })(exports, function() {
      var t = Object.defineProperty, e = (e, r) => {
        let n = {};
        for (var s in e)
          t(n, s, { get: e[s], enumerable: true });
        return r || t(n, Symbol.toStringTag, { value: "Module" }), n;
      }, r = {};
      function n(t, e) {
        typeof e != "string" && (e = n.defaultChars);
        const s = function(t) {
          let e = r[t];
          if (e)
            return e;
          e = r[t] = [];
          for (let r = 0;r < 128; r++) {
            const t = String.fromCharCode(r);
            e.push(t);
          }
          for (let r = 0;r < t.length; r++) {
            const n = t.charCodeAt(r);
            e[n] = "%" + ("0" + n.toString(16).toUpperCase()).slice(-2);
          }
          return e;
        }(e);
        return t.replace(/(%[a-f0-9]{2})+/gi, function(t) {
          let e = "";
          for (let r = 0, n = t.length;r < n; r += 3) {
            const o = parseInt(t.slice(r + 1, r + 3), 16);
            if (o < 128)
              e += s[o];
            else {
              if ((224 & o) == 192 && r + 3 < n) {
                const n = parseInt(t.slice(r + 4, r + 6), 16);
                if ((192 & n) == 128) {
                  const t = o << 6 & 1984 | 63 & n;
                  e += t < 128 ? "��" : String.fromCharCode(t), r += 3;
                  continue;
                }
              }
              if ((240 & o) == 224 && r + 6 < n) {
                const n = parseInt(t.slice(r + 4, r + 6), 16), s = parseInt(t.slice(r + 7, r + 9), 16);
                if ((192 & n) == 128 && (192 & s) == 128) {
                  const t = o << 12 & 61440 | n << 6 & 4032 | 63 & s;
                  e += t < 2048 || t >= 55296 && t <= 57343 ? "���" : String.fromCharCode(t), r += 6;
                  continue;
                }
              }
              if ((248 & o) == 240 && r + 9 < n) {
                const n = parseInt(t.slice(r + 4, r + 6), 16), s = parseInt(t.slice(r + 7, r + 9), 16), i = parseInt(t.slice(r + 10, r + 12), 16);
                if ((192 & n) == 128 && (192 & s) == 128 && (192 & i) == 128) {
                  let t = o << 18 & 1835008 | n << 12 & 258048 | s << 6 & 4032 | 63 & i;
                  t < 65536 || t > 1114111 ? e += "����" : (t -= 65536, e += String.fromCharCode(55296 + (t >> 10), 56320 + (1023 & t))), r += 9;
                  continue;
                }
              }
              e += "�";
            }
          }
          return e;
        });
      }
      n.defaultChars = ";/?:@&=+$,#", n.componentChars = "";
      var s = {};
      function o(t, e, r) {
        typeof e != "string" && (r = e, e = o.defaultChars), r === undefined && (r = true);
        const n = function(t) {
          let e = s[t];
          if (e)
            return e;
          e = s[t] = [];
          for (let r = 0;r < 128; r++) {
            const t = String.fromCharCode(r);
            /^[0-9a-z]$/i.test(t) ? e.push(t) : e.push("%" + ("0" + r.toString(16).toUpperCase()).slice(-2));
          }
          for (let r = 0;r < t.length; r++)
            e[t.charCodeAt(r)] = t[r];
          return e;
        }(e);
        let i = "";
        for (let s = 0, o = t.length;s < o; s++) {
          const e = t.charCodeAt(s);
          if (r && e === 37 && s + 2 < o && /^[0-9a-f]{2}$/i.test(t.slice(s + 1, s + 3)))
            i += t.slice(s, s + 3), s += 2;
          else if (e < 128)
            i += n[e];
          else if (e >= 55296 && e <= 57343) {
            if (e >= 55296 && e <= 56319 && s + 1 < o) {
              const e = t.charCodeAt(s + 1);
              if (e >= 56320 && e <= 57343) {
                i += encodeURIComponent(t[s] + t[s + 1]), s++;
                continue;
              }
            }
            i += "%EF%BF%BD";
          } else
            i += encodeURIComponent(t[s]);
        }
        return i;
      }
      function i(t) {
        let e = "";
        return e += t.protocol || "", e += t.slashes ? "//" : "", e += t.auth ? t.auth + "@" : "", t.hostname && t.hostname.indexOf(":") !== -1 ? e += "[" + t.hostname + "]" : e += t.hostname || "", e += t.port ? ":" + t.port : "", e += t.pathname || "", e += t.search || "", e += t.hash || "", e;
      }
      function u() {
        this.protocol = null, this.slashes = null, this.auth = null, this.port = null, this.hostname = null, this.hash = null, this.search = null, this.pathname = null;
      }
      o.defaultChars = ";/?:@&=+$,-_.!~*'()#", o.componentChars = "-_.!~*'()";
      var c = /^([a-z0-9.+-]+:)/i, a = /:[0-9]*$/, l = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/, h = ["{", "}", "|", "\\", "^", "`"].concat(["<", ">", '"', "`", " ", "\r", `
`, "\t"]), p = ["'"].concat(h), f = ["%", "/", "?", ";", "#"].concat(p), d = ["/", "?", "#"], m = /^[+a-z0-9A-Z_-]{0,63}$/, _ = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, g = { javascript: true, "javascript:": true }, k = { http: true, https: true, ftp: true, gopher: true, file: true, "http:": true, "https:": true, "ftp:": true, "gopher:": true, "file:": true };
      function D(t, e) {
        if (t && t instanceof u)
          return t;
        const r = new u;
        return r.parse(t, e), r;
      }
      u.prototype.parse = function(t, e) {
        let r, n, s, o = t;
        if (o = o.trim(), !e && t.split("#").length === 1) {
          const t = l.exec(o);
          if (t)
            return this.pathname = t[1], t[2] && (this.search = t[2]), this;
        }
        let i = c.exec(o);
        if (i && (i = i[0], r = i.toLowerCase(), this.protocol = i, o = o.substr(i.length)), (e || i || o.match(/^\/\/[^@\/]+@[^@\/]+/)) && (s = o.substr(0, 2) === "//", !s || i && g[i] || (o = o.substr(2), this.slashes = true)), !g[i] && (s || i && !k[i])) {
          let t, e, r = -1;
          for (let u = 0;u < d.length; u++)
            n = o.indexOf(d[u]), n !== -1 && (r === -1 || n < r) && (r = n);
          e = r === -1 ? o.lastIndexOf("@") : o.lastIndexOf("@", r), e !== -1 && (t = o.slice(0, e), o = o.slice(e + 1), this.auth = t), r = -1;
          for (let u = 0;u < f.length; u++)
            n = o.indexOf(f[u]), n !== -1 && (r === -1 || n < r) && (r = n);
          r === -1 && (r = o.length), o[r - 1] === ":" && r--;
          const s = o.slice(0, r);
          o = o.slice(r), this.parseHost(s), this.hostname = this.hostname || "";
          const i = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
          if (!i) {
            const t = this.hostname.split(/\./);
            for (let e = 0, r = t.length;e < r; e++) {
              const r = t[e];
              if (r && !r.match(m)) {
                let n = "";
                for (let t = 0, e = r.length;t < e; t++)
                  r.charCodeAt(t) > 127 ? n += "x" : n += r[t];
                if (!n.match(m)) {
                  const n = t.slice(0, e), s = t.slice(e + 1), i = r.match(_);
                  i && (n.push(i[1]), s.unshift(i[2])), s.length && (o = s.join(".") + o), this.hostname = n.join(".");
                  break;
                }
              }
            }
          }
          this.hostname.length > 255 && (this.hostname = ""), i && (this.hostname = this.hostname.substr(1, this.hostname.length - 2));
        }
        const u = o.indexOf("#");
        u !== -1 && (this.hash = o.substr(u), o = o.slice(0, u));
        const a = o.indexOf("?");
        return a !== -1 && (this.search = o.substr(a), o = o.slice(0, a)), o && (this.pathname = o), k[r] && this.hostname && !this.pathname && (this.pathname = ""), this;
      }, u.prototype.parseHost = function(t) {
        let e = a.exec(t);
        e && (e = e[0], e !== ":" && (this.port = e.substr(1)), t = t.substr(0, t.length - e.length)), t && (this.hostname = t);
      };
      var C, y, A = e({ decode: () => n, encode: () => o, format: () => i, parse: () => D }), E = /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, b = /[\0-\x1F\x7F-\x9F]/, F = /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/, x = /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/, v = /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/, w = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/, z = e({ Any: () => E, Cc: () => b, Cf: () => F, P: () => x, S: () => v, Z: () => w }), S = new Uint16Array("ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\x00\x00\x00\x00\x00\x00ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀\uD835\uDD04rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀\uD835\uDD38plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀\uD835\uDC9Cign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀\uD835\uDD05pf;쀀\uD835\uDD39eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀\uD835\uDC9EpĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀\uD835\uDD07Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\x00\x00\x00͔͂\x00Ѕf;쀀\uD835\uDD3Bƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\x00\x00ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\x00\x00ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\x00ц\x00ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\x00ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀\uD835\uDC9Frok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀\uD835\uDD08rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\x00\x00ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀\uD835\uDD3Csilon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀\uD835\uDD09lledɓ֗\x00\x00֣mallSquare;旼erySmallSquare;斪Ͱֺ\x00ֿ\x00\x00ׄf;쀀\uD835\uDD3DAll;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀\uD835\uDD0A;拙pf;쀀\uD835\uDD3Eeater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀\uD835\uDCA2;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\x00ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\x00ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀\uD835\uDD40a;䎙cr;愐ilde;䄨ǫޚ\x00ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀\uD835\uDD0Dpf;쀀\uD835\uDD41ǣ߇\x00ߌr;쀀\uD835\uDCA5rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀\uD835\uDD0Epf;쀀\uD835\uDD42cr;쀀\uD835\uDCA6րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\x00ࣃbleBracket;柦nǔࣈ\x00࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀\uD835\uDD0FĀ;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀\uD835\uDD43erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀\uD835\uDD10nusPlus;戓pf;쀀\uD835\uDD44cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀\uD835\uDD11ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀\uD835\uDCA9ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀\uD835\uDD12rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀\uD835\uDD46enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀\uD835\uDCAAash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀\uD835\uDD13i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀\uD835\uDCAB;䎨ȀUfos༑༖༛༟OT耻\"䀢r;쀀\uD835\uDD14pf;愚cr;쀀\uD835\uDCAC؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\x00စbleBracket;柧nǔည\x00နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀\uD835\uDD16ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀\uD835\uDD4Aɲᅭ\x00\x00ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀\uD835\uDCAEar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀\uD835\uDD17Āeiቻ኉ǲኀ\x00ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀\uD835\uDD4BipleDot;惛Āctዖዛr;쀀\uD835\uDCAFrok;䅦ૡዷጎጚጦ\x00ጬጱ\x00\x00\x00\x00\x00ጸጽ፷ᎅ\x00᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\x00጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀\uD835\uDD18rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀\uD835\uDD4CЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀\uD835\uDCB0ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀\uD835\uDD19pf;쀀\uD835\uDD4Dcr;쀀\uD835\uDCB1dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀\uD835\uDD1Apf;쀀\uD835\uDD4Ecr;쀀\uD835\uDCB2Ȁfiosᓋᓐᓒᓘr;쀀\uD835\uDD1B;䎞pf;쀀\uD835\uDD4Fcr;쀀\uD835\uDCB3ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀\uD835\uDD1Cpf;쀀\uD835\uDD50cr;쀀\uD835\uDCB4ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\x00ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀\uD835\uDCB5௡ᖃᖊᖐ\x00ᖰᖶᖿ\x00\x00\x00\x00ᗆᗛᗫᙟ᙭\x00ᚕ᚛ᚲᚹ\x00ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀\uD835\uDD1Erave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\x00\x00ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀\uD835\uDD52΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀\uD835\uDCB6;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀\uD835\uDD1Fg΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\x00\x00ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\x00ᠳƲᠯ\x00ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀\uD835\uDD53Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀\uD835\uDCB7mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\x00᧨ᨑᨕᨲ\x00ᨷᩐ\x00\x00᪴\x00\x00᫁\x00\x00ᬡᬮ᭍᭒\x00᯽\x00ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\x00᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀\uD835\uDD20ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\x00\x00᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\x00ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\x00\x00᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\x00ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀\uD835\uDD54oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀\uD835\uDCB8Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\x00\x00᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\x00\x00ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀\uD835\uDD21arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\x00\x00ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀\uD835\uDD55ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\x00\x00ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀\uD835\uDCB9;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀\uD835\uDD22ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀\uD835\uDD56ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\x00\x00ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\x00ᾞ\x00ᾡᾧ\x00\x00ῆῌ\x00ΐ\x00ῦῪ \x00 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\x00\x00᾽g;耀ﬀig;耀ﬄ;쀀\uD835\uDD23lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\x00ῳf;쀀\uD835\uDD57ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\x00⁐β•‥‧‪‬\x00‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\x00‶;慔;慖ʴ‾⁁\x00\x00⁃耻¾䂾;慗;慜5;慘ƶ⁌\x00⁎;慚;慝8;慞l;恄wn;挢cr;쀀\uD835\uDCBBࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀\uD835\uDD24Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀\uD835\uDD58Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\x00↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀\uD835\uDD25sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀\uD835\uDD59bar;怕ƀclt≯≴≸r;쀀\uD835\uDCBDasè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\x00⊪\x00⊸⋅⋎\x00⋕⋳\x00\x00⋸⌢⍧⍢⍿\x00⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀\uD835\uDD26rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀\uD835\uDD5Aa;䎹uest耻¿䂿Āci⎊⎏r;쀀\uD835\uDCBEnʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\x00⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀\uD835\uDD27ath;䈷pf;쀀\uD835\uDD5Bǣ⏬\x00⏱r;쀀\uD835\uDCBFrcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀\uD835\uDD28reen;䄸cy;䑅cy;䑜pf;쀀\uD835\uDD5Ccr;쀀\uD835\uDCC0஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\x00⒪\x00⒱\x00\x00\x00\x00\x00⒵Ⓔ\x00ⓆⓈⓍ\x00⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀\uD835\uDD29Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀\uD835\uDD5Dus;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀\uD835\uDCC1mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀\uD835\uDD2Ao;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀\uD835\uDD5EĀct⣸⣽r;쀀\uD835\uDCC2pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\x00⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\x00⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀\uD835\uDD2BȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀\uD835\uDD5F膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀\uD835\uDCC3ortɭ⬅\x00\x00⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00ⴭ\x00ⴸⵈⵠⵥ⵲ⶄᬇ\x00\x00ⶍⶫ\x00ⷈⷎ\x00ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀\uD835\uDD2Cͯ⵹\x00\x00⵼\x00ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀\uD835\uDD60ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\x00⹽\x00⺀⺝\x00⺢⺹\x00\x00⻋ຜ\x00⼓\x00\x00⼫⾼\x00⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\x00\x00⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀\uD835\uDD2Dƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀\uD835\uDD61nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀\uD835\uDCC5;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀\uD835\uDD2Epf;쀀\uD835\uDD62rime;恗cr;쀀\uD835\uDCC6ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀\uD835\uDD2FĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀\uD835\uDD63us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀\uD835\uDCC7Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\x00㍺㎤\x00\x00㏬㏰\x00㐨㑈㑚㒭㒱㓊㓱\x00㘖\x00\x00㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\x00㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀\uD835\uDD30Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\x00\x00㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀\uD835\uDD64aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀\uD835\uDCC8tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\x00㙾㛂\x00\x00\x00\x00\x00㛛㜃\x00㜉㝬\x00\x00\x00㞇ɲ㙖\x00\x00㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀\uD835\uDD31Ȁeiko㚆㚝㚵㚼ǲ㚋\x00㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀\uD835\uDD65rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀\uD835\uDCC9;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\x00㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀\uD835\uDD32rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\x00\x00㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀\uD835\uDD66̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\x00\x00㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀\uD835\uDCCAƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀\uD835\uDD33tré㦮suĀbp㧯㧱»ജ»൙pf;쀀\uD835\uDD67roð໻tré㦴Ācu㨆㨋r;쀀\uD835\uDCCBĀbp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀\uD835\uDD34pf;쀀\uD835\uDD68Ā;eᑹ㩦atèᑹcr;쀀\uD835\uDCCCૣណ㪇\x00㪋\x00㪐㪛\x00\x00㪝㪨㪫㪯\x00\x00㫃㫎\x00㫘ៜ៟tré៑r;쀀\uD835\uDD35ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀\uD835\uDD69imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀\uD835\uDCCDĀpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀\uD835\uDD36cy;䑗pf;쀀\uD835\uDD6Acr;쀀\uD835\uDCCEĀcm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀\uD835\uDD37cy;䐶grarr;懝pf;쀀\uD835\uDD6Bcr;쀀\uD835\uDCCFĀjn㮅㮇;怍j;怌".split("").map((t) => t.charCodeAt(0))), q = new Uint16Array("Ȁaglq\t\x15\x18\x1Bɭ\x0F\x00\x00\x12p;䀦os;䀧t;䀾t;䀼uot;䀢".split("").map((t) => t.charCodeAt(0))), B = new Map([[0, 65533], [128, 8364], [130, 8218], [131, 402], [132, 8222], [133, 8230], [134, 8224], [135, 8225], [136, 710], [137, 8240], [138, 352], [139, 8249], [140, 338], [142, 381], [145, 8216], [146, 8217], [147, 8220], [148, 8221], [149, 8226], [150, 8211], [151, 8212], [152, 732], [153, 8482], [154, 353], [155, 8250], [156, 339], [158, 382], [159, 376]]), L = (C = String.fromCodePoint) !== null && C !== undefined ? C : function(t) {
        let e = "";
        return t > 65535 && (t -= 65536, e += String.fromCharCode(t >>> 10 & 1023 | 55296), t = 56320 | 1023 & t), e += String.fromCharCode(t), e;
      };
      (function(t) {
        t[t.NUM = 35] = "NUM", t[t.SEMI = 59] = "SEMI", t[t.EQUALS = 61] = "EQUALS", t[t.ZERO = 48] = "ZERO", t[t.NINE = 57] = "NINE", t[t.LOWER_A = 97] = "LOWER_A", t[t.LOWER_F = 102] = "LOWER_F", t[t.LOWER_X = 120] = "LOWER_X", t[t.LOWER_Z = 122] = "LOWER_Z", t[t.UPPER_A = 65] = "UPPER_A", t[t.UPPER_F = 70] = "UPPER_F", t[t.UPPER_Z = 90] = "UPPER_Z";
      })(y || (y = {}));
      var I, M, T;
      function $(t) {
        return t >= y.ZERO && t <= y.NINE;
      }
      function R(t) {
        return t >= y.UPPER_A && t <= y.UPPER_F || t >= y.LOWER_A && t <= y.LOWER_F;
      }
      function N(t) {
        return t === y.EQUALS || function(t) {
          return t >= y.UPPER_A && t <= y.UPPER_Z || t >= y.LOWER_A && t <= y.LOWER_Z || $(t);
        }(t);
      }
      (function(t) {
        t[t.VALUE_LENGTH = 49152] = "VALUE_LENGTH", t[t.BRANCH_LENGTH = 16256] = "BRANCH_LENGTH", t[t.JUMP_TABLE = 127] = "JUMP_TABLE";
      })(I || (I = {})), function(t) {
        t[t.EntityStart = 0] = "EntityStart", t[t.NumericStart = 1] = "NumericStart", t[t.NumericDecimal = 2] = "NumericDecimal", t[t.NumericHex = 3] = "NumericHex", t[t.NamedEntity = 4] = "NamedEntity";
      }(M || (M = {})), function(t) {
        t[t.Legacy = 0] = "Legacy", t[t.Strict = 1] = "Strict", t[t.Attribute = 2] = "Attribute";
      }(T || (T = {}));
      var P = class {
        constructor(t, e, r) {
          this.decodeTree = t, this.emitCodePoint = e, this.errors = r, this.state = M.EntityStart, this.consumed = 1, this.result = 0, this.treeIndex = 0, this.excess = 1, this.decodeMode = T.Strict;
        }
        startEntity(t) {
          this.decodeMode = t, this.state = M.EntityStart, this.result = 0, this.treeIndex = 0, this.excess = 1, this.consumed = 1;
        }
        write(t, e) {
          switch (this.state) {
            case M.EntityStart:
              return t.charCodeAt(e) === y.NUM ? (this.state = M.NumericStart, this.consumed += 1, this.stateNumericStart(t, e + 1)) : (this.state = M.NamedEntity, this.stateNamedEntity(t, e));
            case M.NumericStart:
              return this.stateNumericStart(t, e);
            case M.NumericDecimal:
              return this.stateNumericDecimal(t, e);
            case M.NumericHex:
              return this.stateNumericHex(t, e);
            case M.NamedEntity:
              return this.stateNamedEntity(t, e);
          }
        }
        stateNumericStart(t, e) {
          return e >= t.length ? -1 : (32 | t.charCodeAt(e)) === y.LOWER_X ? (this.state = M.NumericHex, this.consumed += 1, this.stateNumericHex(t, e + 1)) : (this.state = M.NumericDecimal, this.stateNumericDecimal(t, e));
        }
        addToNumericResult(t, e, r, n) {
          if (e !== r) {
            const s = r - e;
            this.result = this.result * Math.pow(n, s) + parseInt(t.substr(e, s), n), this.consumed += s;
          }
        }
        stateNumericHex(t, e) {
          const r = e;
          for (;e < t.length; ) {
            const n = t.charCodeAt(e);
            if (!$(n) && !R(n))
              return this.addToNumericResult(t, r, e, 16), this.emitNumericEntity(n, 3);
            e += 1;
          }
          return this.addToNumericResult(t, r, e, 16), -1;
        }
        stateNumericDecimal(t, e) {
          const r = e;
          for (;e < t.length; ) {
            const n = t.charCodeAt(e);
            if (!$(n))
              return this.addToNumericResult(t, r, e, 10), this.emitNumericEntity(n, 2);
            e += 1;
          }
          return this.addToNumericResult(t, r, e, 10), -1;
        }
        emitNumericEntity(t, e) {
          var r;
          if (this.consumed <= e)
            return (r = this.errors) === null || r === undefined || r.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
          if (t === y.SEMI)
            this.consumed += 1;
          else if (this.decodeMode === T.Strict)
            return 0;
          return this.emitCodePoint(function(t) {
            var e;
            return t >= 55296 && t <= 57343 || t > 1114111 ? 65533 : (e = B.get(t)) !== null && e !== undefined ? e : t;
          }(this.result), this.consumed), this.errors && (t !== y.SEMI && this.errors.missingSemicolonAfterCharacterReference(), this.errors.validateNumericCharacterReference(this.result)), this.consumed;
        }
        stateNamedEntity(t, e) {
          const { decodeTree: r } = this;
          let n = r[this.treeIndex], s = (n & I.VALUE_LENGTH) >> 14;
          for (;e < t.length; e++, this.excess++) {
            const o = t.charCodeAt(e);
            if (this.treeIndex = Z(r, n, this.treeIndex + Math.max(1, s), o), this.treeIndex < 0)
              return this.result === 0 || this.decodeMode === T.Attribute && (s === 0 || N(o)) ? 0 : this.emitNotTerminatedNamedEntity();
            if (n = r[this.treeIndex], s = (n & I.VALUE_LENGTH) >> 14, s !== 0) {
              if (o === y.SEMI)
                return this.emitNamedEntityData(this.treeIndex, s, this.consumed + this.excess);
              this.decodeMode !== T.Strict && (this.result = this.treeIndex, this.consumed += this.excess, this.excess = 0);
            }
          }
          return -1;
        }
        emitNotTerminatedNamedEntity() {
          var t;
          const { result: e, decodeTree: r } = this, n = (r[e] & I.VALUE_LENGTH) >> 14;
          return this.emitNamedEntityData(e, n, this.consumed), (t = this.errors) === null || t === undefined || t.missingSemicolonAfterCharacterReference(), this.consumed;
        }
        emitNamedEntityData(t, e, r) {
          const { decodeTree: n } = this;
          return this.emitCodePoint(e === 1 ? n[t] & ~I.VALUE_LENGTH : n[t + 1], r), e === 3 && this.emitCodePoint(n[t + 2], r), r;
        }
        end() {
          var t;
          switch (this.state) {
            case M.NamedEntity:
              return this.result === 0 || this.decodeMode === T.Attribute && this.result !== this.treeIndex ? 0 : this.emitNotTerminatedNamedEntity();
            case M.NumericDecimal:
              return this.emitNumericEntity(0, 2);
            case M.NumericHex:
              return this.emitNumericEntity(0, 3);
            case M.NumericStart:
              return (t = this.errors) === null || t === undefined || t.absenceOfDigitsInNumericCharacterReference(this.consumed), 0;
            case M.EntityStart:
              return 0;
          }
        }
      };
      function O(t) {
        let e = "";
        const r = new P(t, (t) => e += L(t));
        return function(t, n) {
          let s = 0, o = 0;
          for (;(o = t.indexOf("&", o)) >= 0; ) {
            e += t.slice(s, o), r.startEntity(n);
            const i = r.write(t, o + 1);
            if (i < 0) {
              s = o + r.end();
              break;
            }
            s = o + i, o = i === 0 ? s + 1 : s;
          }
          const i = e + t.slice(s);
          return e = "", i;
        };
      }
      function Z(t, e, r, n) {
        const s = (e & I.BRANCH_LENGTH) >> 7, o = e & I.JUMP_TABLE;
        if (s === 0)
          return o !== 0 && n === o ? r : -1;
        if (o) {
          const e = n - o;
          return e < 0 || e >= s ? -1 : t[r + e] - 1;
        }
        let i = r, u = i + s - 1;
        for (;i <= u; ) {
          const e = i + u >>> 1, r = t[e];
          if (r < n)
            i = e + 1;
          else {
            if (!(r > n))
              return t[e + s];
            u = e - 1;
          }
        }
        return -1;
      }
      var j = O(S);
      O(q);
      var U = e({ arrayReplaceAt: () => Q, asciiTrim: () => kt, assign: () => W, escapeHtml: () => ct, escapeRE: () => lt, fromCodePoint: () => X, has: () => G, isMdAsciiPunct: () => mt, isPunctChar: () => ft, isPunctCharCode: () => dt, isSpace: () => ht, isString: () => H, isValidEntityCode: () => J, isWhiteSpace: () => pt, lib: () => Dt, normalizeReference: () => _t, unescapeAll: () => nt, unescapeMd: () => rt });
      function H(t) {
        return function(t) {
          return Object.prototype.toString.call(t);
        }(t) === "[object String]";
      }
      var V = Object.prototype.hasOwnProperty;
      function G(t, e) {
        return V.call(t, e);
      }
      function W(t) {
        return Array.prototype.slice.call(arguments, 1).forEach(function(e) {
          if (e) {
            if (typeof e != "object")
              throw new TypeError(e + "must be object");
            Object.keys(e).forEach(function(r) {
              t[r] = e[r];
            });
          }
        }), t;
      }
      function Q(t, e, r) {
        return [].concat(t.slice(0, e), r, t.slice(e + 1));
      }
      function J(t) {
        return !(t >= 55296 && t <= 57343) && (!(t >= 64976 && t <= 65007) && (!!(65535 & ~t && (65535 & t) != 65534) && (!(t >= 0 && t <= 8) && (t !== 11 && (!(t >= 14 && t <= 31) && (!(t >= 127 && t <= 159) && !(t > 1114111)))))));
      }
      function X(t) {
        if (t > 65535) {
          const e = 55296 + ((t -= 65536) >> 10), r = 56320 + (1023 & t);
          return String.fromCharCode(e, r);
        }
        return String.fromCharCode(t);
      }
      var Y = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, K = new RegExp(Y.source + "|" + /&([a-z#][a-z0-9]{1,31});/gi.source, "gi"), tt = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;
      function et(t, e) {
        if (e.charCodeAt(0) === 35 && tt.test(e)) {
          const r = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
          return J(r) ? X(r) : t;
        }
        const r = function(t, e = T.Legacy) {
          return j(t, e);
        }(t);
        return r !== t ? r : t;
      }
      function rt(t) {
        return t.indexOf("\\") < 0 ? t : t.replace(Y, "$1");
      }
      function nt(t) {
        return t.indexOf("\\") < 0 && t.indexOf("&") < 0 ? t : t.replace(K, function(t, e, r) {
          return e || et(t, r);
        });
      }
      var st = /[&<>"]/, ot = /[&<>"]/g, it = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
      function ut(t) {
        return it[t];
      }
      function ct(t) {
        return st.test(t) ? t.replace(ot, ut) : t;
      }
      var at = /[.?*+^$[\]\\(){}|-]/g;
      function lt(t) {
        return t.replace(at, "\\$&");
      }
      function ht(t) {
        switch (t) {
          case 9:
          case 32:
            return true;
        }
        return false;
      }
      function pt(t) {
        if (t >= 8192 && t <= 8202)
          return true;
        switch (t) {
          case 9:
          case 10:
          case 11:
          case 12:
          case 13:
          case 32:
          case 160:
          case 5760:
          case 8239:
          case 8287:
          case 12288:
            return true;
        }
        return false;
      }
      function ft(t) {
        return x.test(t) || v.test(t);
      }
      function dt(t) {
        return ft(X(t));
      }
      function mt(t) {
        switch (t) {
          case 33:
          case 34:
          case 35:
          case 36:
          case 37:
          case 38:
          case 39:
          case 40:
          case 41:
          case 42:
          case 43:
          case 44:
          case 45:
          case 46:
          case 47:
          case 58:
          case 59:
          case 60:
          case 61:
          case 62:
          case 63:
          case 64:
          case 91:
          case 92:
          case 93:
          case 94:
          case 95:
          case 96:
          case 123:
          case 124:
          case 125:
          case 126:
            return true;
          default:
            return false;
        }
      }
      function _t(t) {
        return t = t.trim().replace(/\s+/g, " "), "ẞ".toLowerCase() === "Ṿ" && (t = t.replace(/\u1e9e/g, "ß")), t.toLowerCase().toUpperCase();
      }
      function gt(t) {
        return t === 32 || t === 9 || t === 10 || t === 13;
      }
      function kt(t) {
        let e = 0;
        for (;e < t.length && gt(t.charCodeAt(e)); e++)
          ;
        let r = t.length - 1;
        for (;r >= e && gt(t.charCodeAt(r)); r--)
          ;
        return t.slice(e, r + 1);
      }
      var Dt = { mdurl: A, ucmicro: z };
      function Ct(t, e, r) {
        let n, s, o, i;
        const { posMax: u, pos: c } = t;
        for (t.pos = e + 1, n = 1;t.pos < u; ) {
          if (o = t.src.charCodeAt(t.pos), o === 93 && (n--, n === 0)) {
            s = true;
            break;
          }
          if (i = t.pos, t.md.inline.skipToken(t), o === 91) {
            if (i === t.pos - 1)
              n++;
            else if (r)
              return t.pos = c, -1;
          }
        }
        let a = -1;
        return s && (a = t.pos), t.pos = c, a;
      }
      function yt(t, e, r) {
        let n, s = e;
        const o = { ok: false, pos: 0, str: "" };
        if (t.charCodeAt(s) === 60) {
          for (s++;s < r; ) {
            if (n = t.charCodeAt(s), n === 10)
              return o;
            if (n === 60)
              return o;
            if (n === 62)
              return o.pos = s + 1, o.str = nt(t.slice(e + 1, s)), o.ok = true, o;
            n === 92 && s + 1 < r ? s += 2 : s++;
          }
          return o;
        }
        let i = 0;
        for (;s < r && (n = t.charCodeAt(s), n !== 32) && !(n < 32 || n === 127); )
          if (n === 92 && s + 1 < r) {
            if (t.charCodeAt(s + 1) === 32) {
              s++;
              continue;
            }
            s += 2;
          } else {
            if (n === 40 && (i++, i > 32))
              return o;
            if (n === 41) {
              if (i === 0)
                break;
              i--;
            }
            s++;
          }
        return e === s || i !== 0 || (o.str = nt(t.slice(e, s)), o.pos = s, o.ok = true), o;
      }
      function At(t, e, r, n) {
        let s, o = e;
        const i = { ok: false, can_continue: false, pos: 0, str: "", marker: 0 };
        if (n)
          i.str = n.str, i.marker = n.marker;
        else {
          if (o >= r)
            return i;
          let n = t.charCodeAt(o);
          if (n !== 34 && n !== 39 && n !== 40)
            return i;
          e++, o++, n === 40 && (n = 41), i.marker = n;
        }
        for (;o < r; ) {
          if (s = t.charCodeAt(o), s === i.marker)
            return i.pos = o + 1, i.str += nt(t.slice(e, o)), i.ok = true, i;
          if (s === 40 && i.marker === 41)
            return i;
          s === 92 && o + 1 < r && o++, o++;
        }
        return i.can_continue = true, i.str += nt(t.slice(e, o)), i;
      }
      var Et = e({ parseLinkDestination: () => yt, parseLinkLabel: () => Ct, parseLinkTitle: () => At }), bt = {};
      function Ft() {
        this.rules = W({}, bt);
      }
      function xt() {
        this.__rules__ = [], this.__cache__ = null;
      }
      function vt(t, e, r) {
        this.type = t, this.tag = e, this.attrs = null, this.map = null, this.nesting = r, this.level = 0, this.children = null, this.content = "", this.markup = "", this.info = "", this.meta = null, this.block = false, this.hidden = false;
      }
      function wt(t, e, r) {
        this.src = t, this.env = r, this.tokens = [], this.inlineMode = false, this.md = e;
      }
      bt.code_inline = function(t, e, r, n, s) {
        const o = t[e];
        return "<code" + s.renderAttrs(o) + ">" + ct(o.content) + "</code>";
      }, bt.code_block = function(t, e, r, n, s) {
        const o = t[e];
        return "<pre" + s.renderAttrs(o) + "><code>" + ct(t[e].content) + `</code></pre>
`;
      }, bt.fence = function(t, e, r, n, s) {
        const o = t[e], i = o.info ? nt(o.info).trim() : "";
        let u, c = "", a = "";
        if (i) {
          const t = i.split(/(\s+)/g);
          c = t[0], a = t.slice(2).join("");
        }
        if (u = r.highlight && r.highlight(o.content, c, a) || ct(o.content), u.indexOf("<pre") === 0)
          return u + `
`;
        if (i) {
          const t = o.attrIndex("class"), e = o.attrs ? o.attrs.slice() : [];
          t < 0 ? e.push(["class", r.langPrefix + c]) : (e[t] = e[t].slice(), e[t][1] += " " + r.langPrefix + c);
          const n = { attrs: e };
          return `<pre><code${s.renderAttrs(n)}>${u}</code></pre>
`;
        }
        return `<pre><code${s.renderAttrs(o)}>${u}</code></pre>
`;
      }, bt.image = function(t, e, r, n, s) {
        const o = t[e];
        return o.attrs[o.attrIndex("alt")][1] = s.renderInlineAsText(o.children, r, n), s.renderToken(t, e, r);
      }, bt.hardbreak = function(t, e, r) {
        return r.xhtmlOut ? `<br />
` : `<br>
`;
      }, bt.softbreak = function(t, e, r) {
        return r.breaks ? r.xhtmlOut ? `<br />
` : `<br>
` : `
`;
      }, bt.text = function(t, e) {
        return ct(t[e].content);
      }, bt.html_block = function(t, e) {
        return t[e].content;
      }, bt.html_inline = function(t, e) {
        return t[e].content;
      }, Ft.prototype.renderAttrs = function(t) {
        let e, r, n;
        if (!t.attrs)
          return "";
        for (n = "", e = 0, r = t.attrs.length;e < r; e++)
          n += " " + ct(t.attrs[e][0]) + '="' + ct(t.attrs[e][1]) + '"';
        return n;
      }, Ft.prototype.renderToken = function(t, e, r) {
        const n = t[e];
        let s = "";
        if (n.hidden)
          return "";
        n.block && n.nesting !== -1 && e && t[e - 1].hidden && (s += `
`), s += (n.nesting === -1 ? "</" : "<") + n.tag, s += this.renderAttrs(n), n.nesting === 0 && r.xhtmlOut && (s += " /");
        let o = false;
        if (n.block && (o = true, n.nesting === 1 && e + 1 < t.length)) {
          const r = t[e + 1];
          (r.type === "inline" || r.hidden || r.nesting === -1 && r.tag === n.tag) && (o = false);
        }
        return s += o ? `>
` : ">", s;
      }, Ft.prototype.renderInline = function(t, e, r) {
        let n = "";
        const s = this.rules;
        for (let o = 0, i = t.length;o < i; o++) {
          const i = t[o].type;
          s[i] !== undefined ? n += s[i](t, o, e, r, this) : n += this.renderToken(t, o, e);
        }
        return n;
      }, Ft.prototype.renderInlineAsText = function(t, e, r) {
        let n = "";
        for (let s = 0, o = t.length;s < o; s++)
          switch (t[s].type) {
            case "text":
            case "html_inline":
            case "html_block":
              n += t[s].content;
              break;
            case "image":
              n += this.renderInlineAsText(t[s].children, e, r);
              break;
            case "softbreak":
            case "hardbreak":
              n += `
`;
          }
        return n;
      }, Ft.prototype.render = function(t, e, r) {
        let n = "";
        const s = this.rules;
        for (let o = 0, i = t.length;o < i; o++) {
          const i = t[o].type;
          i === "inline" ? n += this.renderInline(t[o].children, e, r) : s[i] !== undefined ? n += s[i](t, o, e, r, this) : n += this.renderToken(t, o, e, r);
        }
        return n;
      }, xt.prototype.__find__ = function(t) {
        for (let e = 0;e < this.__rules__.length; e++)
          if (this.__rules__[e].name === t)
            return e;
        return -1;
      }, xt.prototype.__compile__ = function() {
        const t = this, e = [""];
        t.__rules__.forEach(function(t) {
          t.enabled && t.alt.forEach(function(t) {
            e.indexOf(t) < 0 && e.push(t);
          });
        }), t.__cache__ = {}, e.forEach(function(e) {
          t.__cache__[e] = [], t.__rules__.forEach(function(r) {
            r.enabled && (e && r.alt.indexOf(e) < 0 || t.__cache__[e].push(r.fn));
          });
        });
      }, xt.prototype.at = function(t, e, r) {
        const n = this.__find__(t), s = r || {};
        if (n === -1)
          throw new Error("Parser rule not found: " + t);
        this.__rules__[n].fn = e, this.__rules__[n].alt = s.alt || [], this.__cache__ = null;
      }, xt.prototype.before = function(t, e, r, n) {
        const s = this.__find__(t), o = n || {};
        if (s === -1)
          throw new Error("Parser rule not found: " + t);
        this.__rules__.splice(s, 0, { name: e, enabled: true, fn: r, alt: o.alt || [] }), this.__cache__ = null;
      }, xt.prototype.after = function(t, e, r, n) {
        const s = this.__find__(t), o = n || {};
        if (s === -1)
          throw new Error("Parser rule not found: " + t);
        this.__rules__.splice(s + 1, 0, { name: e, enabled: true, fn: r, alt: o.alt || [] }), this.__cache__ = null;
      }, xt.prototype.push = function(t, e, r) {
        const n = r || {};
        this.__rules__.push({ name: t, enabled: true, fn: e, alt: n.alt || [] }), this.__cache__ = null;
      }, xt.prototype.enable = function(t, e) {
        Array.isArray(t) || (t = [t]);
        const r = [];
        return t.forEach(function(t) {
          const n = this.__find__(t);
          if (n < 0) {
            if (e)
              return;
            throw new Error("Rules manager: invalid rule name " + t);
          }
          this.__rules__[n].enabled = true, r.push(t);
        }, this), this.__cache__ = null, r;
      }, xt.prototype.enableOnly = function(t, e) {
        Array.isArray(t) || (t = [t]), this.__rules__.forEach(function(t) {
          t.enabled = false;
        }), this.enable(t, e);
      }, xt.prototype.disable = function(t, e) {
        Array.isArray(t) || (t = [t]);
        const r = [];
        return t.forEach(function(t) {
          const n = this.__find__(t);
          if (n < 0) {
            if (e)
              return;
            throw new Error("Rules manager: invalid rule name " + t);
          }
          this.__rules__[n].enabled = false, r.push(t);
        }, this), this.__cache__ = null, r;
      }, xt.prototype.getRules = function(t) {
        return this.__cache__ === null && this.__compile__(), this.__cache__[t] || [];
      }, vt.prototype.attrIndex = function(t) {
        if (!this.attrs)
          return -1;
        const e = this.attrs;
        for (let r = 0, n = e.length;r < n; r++)
          if (e[r][0] === t)
            return r;
        return -1;
      }, vt.prototype.attrPush = function(t) {
        this.attrs ? this.attrs.push(t) : this.attrs = [t];
      }, vt.prototype.attrSet = function(t, e) {
        const r = this.attrIndex(t), n = [t, e];
        r < 0 ? this.attrPush(n) : this.attrs[r] = n;
      }, vt.prototype.attrGet = function(t) {
        const e = this.attrIndex(t);
        let r = null;
        return e >= 0 && (r = this.attrs[e][1]), r;
      }, vt.prototype.attrJoin = function(t, e) {
        const r = this.attrIndex(t);
        r < 0 ? this.attrPush([t, e]) : this.attrs[r][1] = this.attrs[r][1] + " " + e;
      }, wt.prototype.Token = vt;
      var zt = /\r\n?|\n/g, St = /\0/g;
      function qt(t) {
        return /^<a[>\s]/i.test(t);
      }
      function Bt(t) {
        return /^<\/a\s*>/i.test(t);
      }
      var Lt = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/, It = /\((c|tm|r)\)/i, Mt = /\((c|tm|r)\)/gi, Tt = { c: "©", r: "®", tm: "™" };
      function $t(t, e) {
        return Tt[e.toLowerCase()];
      }
      function Rt(t) {
        let e = 0;
        for (let r = t.length - 1;r >= 0; r--) {
          const n = t[r];
          n.type !== "text" || e || (n.content = n.content.replace(Mt, $t)), n.type === "link_open" && n.info === "auto" && e--, n.type === "link_close" && n.info === "auto" && e++;
        }
      }
      function Nt(t) {
        let e = 0;
        for (let r = t.length - 1;r >= 0; r--) {
          const n = t[r];
          n.type !== "text" || e || Lt.test(n.content) && (n.content = n.content.replace(/\+-/g, "±").replace(/\.{2,}/g, "…").replace(/([?!])\u2026/g, "$1..").replace(/([?!]){4,}/g, "$1$1$1").replace(/,{2,}/g, ",").replace(/(^|[^-])---(?=[^-]|$)/gm, "$1—").replace(/(^|\s)--(?=\s|$)/gm, "$1–").replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, "$1–")), n.type === "link_open" && n.info === "auto" && e--, n.type === "link_close" && n.info === "auto" && e++;
        }
      }
      var Pt = /['"]/, Ot = /['"]/g;
      function Zt(t, e, r) {
        for (;t.length > r; ) {
          const r = t.pop();
          r.isSingleQuote ? e.single = r.prevSameQuoteIdx : e.double = r.prevSameQuoteIdx;
        }
      }
      function jt(t, e, r, n) {
        t[e] || (t[e] = []), t[e].push({ pos: r, ch: n });
      }
      function Ut(t, e) {
        let r;
        const n = [], s = { single: -1, double: -1 }, o = {};
        for (let i = 0;i < t.length; i++) {
          const u = t[i], c = t[i].level;
          for (r = n.length - 1;r >= 0 && !(n[r].level <= c); r--)
            ;
          if (Zt(n, s, r + 1), u.type !== "text")
            continue;
          const a = u.content;
          let l = 0;
          const h = a.length;
          t:
            for (;l < h; ) {
              Ot.lastIndex = l;
              const u = Ot.exec(a);
              if (!u)
                break;
              let p = true, f = true;
              l = u.index + 1;
              const d = u[0] === "'";
              let m = 32;
              if (u.index - 1 >= 0)
                m = a.charCodeAt(u.index - 1);
              else
                for (r = i - 1;r >= 0 && (t[r].type !== "softbreak" && t[r].type !== "hardbreak"); r--)
                  if (t[r].content) {
                    m = t[r].content.charCodeAt(t[r].content.length - 1);
                    break;
                  }
              let _ = 32;
              if (l < h)
                _ = a.charCodeAt(l);
              else
                for (r = i + 1;r < t.length && (t[r].type !== "softbreak" && t[r].type !== "hardbreak"); r++)
                  if (t[r].content) {
                    _ = t[r].content.charCodeAt(0);
                    break;
                  }
              const g = mt(m) || dt(m), k = mt(_) || dt(_), D = pt(m), C = pt(_);
              if (C ? p = false : k && (D || g || (p = false)), D ? f = false : g && (C || k || (f = false)), _ === 34 && u[0] === '"' && m >= 48 && m <= 57 && (f = p = false), p && f && (p = g, f = k), p || f) {
                if (f && (r = d ? s.single : s.double, r >= 0 && n[r].level === c)) {
                  const t = n[r];
                  let c, a;
                  d ? (c = e.md.options.quotes[2], a = e.md.options.quotes[3]) : (c = e.md.options.quotes[0], a = e.md.options.quotes[1]), jt(o, i, u.index, a), jt(o, t.tokenIdx, t.contentPos, c), Zt(n, s, r);
                  continue t;
                }
                if (p) {
                  if (n.length >= 1000)
                    return;
                  n.push({ tokenIdx: i, contentPos: u.index, isSingleQuote: d, level: c, prevSameQuoteIdx: d ? s.single : s.double }), d ? s.single = n.length - 1 : s.double = n.length - 1;
                } else
                  f && d && jt(o, i, u.index, "’");
              } else
                d && jt(o, i, u.index, "’");
            }
        }
        Object.keys(o).forEach(function(e) {
          t[e].content = function(t, e) {
            let r = "", n = 0;
            e.sort((t, e) => t.pos - e.pos);
            for (let s = 0;s < e.length; s++) {
              const o = e[s];
              r += t.slice(n, o.pos) + o.ch, n = o.pos + 1;
            }
            return r + t.slice(n);
          }(t[e].content, o[e]);
        });
      }
      var Ht = [["normalize", function(t) {
        let e;
        e = t.src.replace(zt, `
`), e = e.replace(St, "�"), t.src = e;
      }], ["block", function(t) {
        let e;
        t.inlineMode ? (e = new t.Token("inline", "", 0), e.content = t.src, e.map = [0, 1], e.children = [], t.tokens.push(e)) : t.md.block.parse(t.src, t.md, t.env, t.tokens);
      }], ["inline", function(t) {
        const e = t.tokens;
        for (let r = 0, n = e.length;r < n; r++) {
          const n = e[r];
          n.type === "inline" && t.md.inline.parse(n.content, t.md, t.env, n.children);
        }
      }], ["linkify", function(t) {
        const e = t.tokens;
        if (t.md.options.linkify)
          for (let r = 0, n = e.length;r < n; r++) {
            if (e[r].type !== "inline" || !t.md.linkify.pretest(e[r].content))
              continue;
            const n = e[r].children, s = [];
            let o = 0;
            for (let e = n.length - 1;e >= 0; e--) {
              const r = n[e];
              if (r.type !== "link_close") {
                if (r.type === "html_inline" && (qt(r.content) && o > 0 && o--, Bt(r.content) && o++), !(o > 0) && r.type === "text" && t.md.linkify.test(r.content)) {
                  const o = r.content;
                  let i = t.md.linkify.match(o);
                  const u = [];
                  let c = r.level, a = 0;
                  i.length > 0 && i[0].index === 0 && e > 0 && n[e - 1].type === "text_special" && (i = i.slice(1));
                  for (let e = 0;e < i.length; e++) {
                    const r = i[e].url, n = t.md.normalizeLink(r);
                    if (!t.md.validateLink(n))
                      continue;
                    let s = i[e].text;
                    s = i[e].schema ? i[e].schema !== "mailto:" || /^mailto:/i.test(s) ? t.md.normalizeLinkText(s) : t.md.normalizeLinkText("mailto:" + s).replace(/^mailto:/, "") : t.md.normalizeLinkText("http://" + s).replace(/^http:\/\//, "");
                    const l = i[e].index;
                    if (l > a) {
                      const e = new t.Token("text", "", 0);
                      e.content = o.slice(a, l), e.level = c, u.push(e);
                    }
                    const h = new t.Token("link_open", "a", 1);
                    h.attrs = [["href", n]], h.level = c++, h.markup = "linkify", h.info = "auto", u.push(h);
                    const p = new t.Token("text", "", 0);
                    p.content = s, p.level = c, u.push(p);
                    const f = new t.Token("link_close", "a", -1);
                    f.level = --c, f.markup = "linkify", f.info = "auto", u.push(f), a = i[e].lastIndex;
                  }
                  if (a < o.length) {
                    const e = new t.Token("text", "", 0);
                    e.content = o.slice(a), e.level = c, u.push(e);
                  }
                  s.push({ index: e, nodes: u });
                }
              } else
                for (e--;n[e].level !== r.level && n[e].type !== "link_open"; )
                  e--;
            }
            if (s.length > 0) {
              let t = n.length;
              for (const e of s)
                t += e.nodes.length - 1;
              const o = new Array(t);
              let i = 0, u = 0;
              s.reverse();
              for (let e = 0;e < n.length; e++) {
                const t = s[i];
                if ((t == null ? undefined : t.index) === e) {
                  for (const e of t.nodes)
                    o[u++] = e;
                  i++;
                } else
                  o[u++] = n[e];
              }
              e[r].children = o;
            }
          }
      }], ["replacements", function(t) {
        let e;
        if (t.md.options.typographer)
          for (e = t.tokens.length - 1;e >= 0; e--)
            t.tokens[e].type === "inline" && (It.test(t.tokens[e].content) && Rt(t.tokens[e].children), Lt.test(t.tokens[e].content) && Nt(t.tokens[e].children));
      }], ["smartquotes", function(t) {
        if (t.md.options.typographer)
          for (let e = t.tokens.length - 1;e >= 0; e--)
            t.tokens[e].type === "inline" && Pt.test(t.tokens[e].content) && Ut(t.tokens[e].children, t);
      }], ["text_join", function(t) {
        let e, r;
        const n = t.tokens, s = n.length;
        for (let o = 0;o < s; o++) {
          if (n[o].type !== "inline")
            continue;
          const t = n[o].children, s = t.length;
          for (e = 0;e < s; e++)
            t[e].type === "text_special" && (t[e].type = "text");
          for (e = r = 0;e < s; e++)
            t[e].type === "text" && e + 1 < s && t[e + 1].type === "text" ? t[e + 1].content = t[e].content + t[e + 1].content : (e !== r && (t[r] = t[e]), r++);
          e !== r && (t.length = r);
        }
      }]];
      function Vt() {
        this.ruler = new xt;
        for (let t = 0;t < Ht.length; t++)
          this.ruler.push(Ht[t][0], Ht[t][1]);
      }
      function Gt(t, e, r, n) {
        this.src = t, this.md = e, this.env = r, this.tokens = n, this.bMarks = [], this.eMarks = [], this.tShift = [], this.sCount = [], this.bsCount = [], this.blkIndent = 0, this.line = 0, this.lineMax = 0, this.tight = false, this.ddIndent = -1, this.listIndent = -1, this.parentType = "root", this.level = 0;
        const s = this.src;
        for (let o = 0, i = 0, u = 0, c = 0, a = s.length, l = false;i < a; i++) {
          const t = s.charCodeAt(i);
          if (!l) {
            if (ht(t)) {
              u++, t === 9 ? c += 4 - c % 4 : c++;
              continue;
            }
            l = true;
          }
          t !== 10 && i !== a - 1 || (t !== 10 && i++, this.bMarks.push(o), this.eMarks.push(i), this.tShift.push(u), this.sCount.push(c), this.bsCount.push(0), l = false, u = 0, c = 0, o = i + 1);
        }
        this.bMarks.push(s.length), this.eMarks.push(s.length), this.tShift.push(0), this.sCount.push(0), this.bsCount.push(0), this.lineMax = this.bMarks.length - 1;
      }
      Vt.prototype.process = function(t) {
        const e = this.ruler.getRules("");
        for (let r = 0, n = e.length;r < n; r++)
          e[r](t);
      }, Vt.prototype.State = wt, Gt.prototype.push = function(t, e, r) {
        const n = new vt(t, e, r);
        return n.block = true, r < 0 && this.level--, n.level = this.level, r > 0 && this.level++, this.tokens.push(n), n;
      }, Gt.prototype.isEmpty = function(t) {
        return this.bMarks[t] + this.tShift[t] >= this.eMarks[t];
      }, Gt.prototype.skipEmptyLines = function(t) {
        for (let e = this.lineMax;t < e && !(this.bMarks[t] + this.tShift[t] < this.eMarks[t]); t++)
          ;
        return t;
      }, Gt.prototype.skipSpaces = function(t) {
        for (let e = this.src.length;t < e && ht(this.src.charCodeAt(t)); t++)
          ;
        return t;
      }, Gt.prototype.skipSpacesBack = function(t, e) {
        if (t <= e)
          return t;
        for (;t > e; )
          if (!ht(this.src.charCodeAt(--t)))
            return t + 1;
        return t;
      }, Gt.prototype.skipChars = function(t, e) {
        for (let r = this.src.length;t < r && this.src.charCodeAt(t) === e; t++)
          ;
        return t;
      }, Gt.prototype.skipCharsBack = function(t, e, r) {
        if (t <= r)
          return t;
        for (;t > r; )
          if (e !== this.src.charCodeAt(--t))
            return t + 1;
        return t;
      }, Gt.prototype.getLines = function(t, e, r, n) {
        if (t >= e)
          return "";
        const s = new Array(e - t);
        for (let o = 0, i = t;i < e; i++, o++) {
          let t = 0;
          const u = this.bMarks[i];
          let c, a = u;
          for (c = i + 1 < e || n ? this.eMarks[i] + 1 : this.eMarks[i];a < c && t < r; ) {
            const e = this.src.charCodeAt(a);
            if (ht(e))
              e === 9 ? t += 4 - (t + this.bsCount[i]) % 4 : t++;
            else {
              if (!(a - u < this.tShift[i]))
                break;
              t++;
            }
            a++;
          }
          s[o] = t > r ? new Array(t - r + 1).join(" ") + this.src.slice(a, c) : this.src.slice(a, c);
        }
        return s.join("");
      }, Gt.prototype.Token = vt;
      function Wt(t, e) {
        const r = t.bMarks[e] + t.tShift[e], n = t.eMarks[e];
        return t.src.slice(r, n);
      }
      function Qt(t) {
        const e = [], r = t.length;
        let n = 0, s = t.charCodeAt(n), o = false, i = 0, u = "";
        for (;n < r; )
          s === 124 && (o ? (u += t.substring(i, n - 1), i = n) : (e.push(u + t.substring(i, n)), u = "", i = n + 1)), o = s === 92, n++, s = t.charCodeAt(n);
        return e.push(u + t.substring(i)), e;
      }
      function Jt(t, e) {
        const r = t.eMarks[e];
        let n = t.bMarks[e] + t.tShift[e];
        const s = t.src.charCodeAt(n++);
        return s !== 42 && s !== 45 && s !== 43 || n < r && !ht(t.src.charCodeAt(n)) ? -1 : n;
      }
      function Xt(t, e) {
        const r = t.bMarks[e] + t.tShift[e], n = t.eMarks[e];
        let s = r;
        if (s + 1 >= n)
          return -1;
        let o = t.src.charCodeAt(s++);
        if (o < 48 || o > 57)
          return -1;
        for (;; ) {
          if (s >= n)
            return -1;
          if (o = t.src.charCodeAt(s++), !(o >= 48 && o <= 57)) {
            if (o === 41 || o === 46)
              break;
            return -1;
          }
          if (s - r >= 10)
            return -1;
        }
        return s < n && (o = t.src.charCodeAt(s), !ht(o)) ? -1 : s;
      }
      var Yt = new RegExp(`^(?:<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^"'=<>\`\\x00-\\x20]+|'[^']*'|"[^"]*"))?)*\\s*\\/?>|<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>|<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->|<[?][\\s\\S]*?[?]>|<![A-Za-z][^>]*>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)`), Kt = new RegExp(`^(?:<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^"'=<>\`\\x00-\\x20]+|'[^']*'|"[^"]*"))?)*\\s*\\/?>|<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>)`), te = [[/^<(script|pre|style|textarea)(?=(\s|>|$))/i, /<\/(script|pre|style|textarea)>/i, true], [/^<!--/, /-->/, true], [/^<\?/, /\?>/, true], [/^<![A-Za-z]/, />/, true], [/^<!\[CDATA\[/, /\]\]>/, true], [new RegExp("^</?(" + ["address", "article", "aside", "base", "basefont", "blockquote", "body", "caption", "center", "col", "colgroup", "dd", "details", "dialog", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr", "html", "iframe", "legend", "li", "link", "main", "menu", "menuitem", "nav", "noframes", "ol", "optgroup", "option", "p", "param", "search", "section", "summary", "table", "tbody", "td", "tfoot", "th", "thead", "title", "tr", "track", "ul"].join("|") + ")(?=(\\s|/?>|$))", "i"), /^$/, true], [new RegExp(Kt.source + "\\s*$"), /^$/, false]];
      var ee = [["table", function(t, e, r, n) {
        if (e + 2 > r)
          return false;
        let s = e + 1;
        if (t.sCount[s] < t.blkIndent)
          return false;
        if (t.sCount[s] - t.blkIndent >= 4)
          return false;
        let o = t.bMarks[s] + t.tShift[s];
        if (o >= t.eMarks[s])
          return false;
        const i = t.src.charCodeAt(o++);
        if (i !== 124 && i !== 45 && i !== 58)
          return false;
        if (o >= t.eMarks[s])
          return false;
        const u = t.src.charCodeAt(o++);
        if (u !== 124 && u !== 45 && u !== 58 && !ht(u))
          return false;
        if (i === 45 && ht(u))
          return false;
        for (;o < t.eMarks[s]; ) {
          const e = t.src.charCodeAt(o);
          if (e !== 124 && e !== 45 && e !== 58 && !ht(e))
            return false;
          o++;
        }
        let c = Wt(t, e + 1), a = c.split("|");
        const l = [];
        for (let g = 0;g < a.length; g++) {
          const t = a[g].trim();
          if (!t) {
            if (g === 0 || g === a.length - 1)
              continue;
            return false;
          }
          if (!/^:?-+:?$/.test(t))
            return false;
          t.charCodeAt(t.length - 1) === 58 ? l.push(t.charCodeAt(0) === 58 ? "center" : "right") : t.charCodeAt(0) === 58 ? l.push("left") : l.push("");
        }
        if (c = Wt(t, e).trim(), c.indexOf("|") === -1)
          return false;
        if (t.sCount[e] - t.blkIndent >= 4)
          return false;
        a = Qt(c), a.length && a[0] === "" && a.shift(), a.length && a[a.length - 1] === "" && a.pop();
        const h = a.length;
        if (h === 0 || h !== l.length)
          return false;
        if (n)
          return true;
        const p = t.parentType;
        t.parentType = "table";
        const f = t.md.block.ruler.getRules("blockquote"), d = [e, 0];
        t.push("table_open", "table", 1).map = d, t.push("thead_open", "thead", 1).map = [e, e + 1], t.push("tr_open", "tr", 1).map = [e, e + 1];
        for (let g = 0;g < a.length; g++) {
          const e = t.push("th_open", "th", 1);
          l[g] && (e.attrs = [["style", "text-align:" + l[g]]]);
          const r = t.push("inline", "", 0);
          r.content = a[g].trim(), r.children = [], t.push("th_close", "th", -1);
        }
        let m;
        t.push("tr_close", "tr", -1), t.push("thead_close", "thead", -1);
        let _ = 0;
        for (s = e + 2;s < r && !(t.sCount[s] < t.blkIndent); s++) {
          let n = false;
          for (let e = 0, o = f.length;e < o; e++)
            if (f[e](t, s, r, true)) {
              n = true;
              break;
            }
          if (n)
            break;
          if (c = Wt(t, s).trim(), !c)
            break;
          if (t.sCount[s] - t.blkIndent >= 4)
            break;
          if (a = Qt(c), a.length && a[0] === "" && a.shift(), a.length && a[a.length - 1] === "" && a.pop(), _ += h - a.length, _ > 65536)
            break;
          if (s === e + 2) {
            t.push("tbody_open", "tbody", 1).map = m = [e + 2, 0];
          }
          t.push("tr_open", "tr", 1).map = [s, s + 1];
          for (let e = 0;e < h; e++) {
            const r = t.push("td_open", "td", 1);
            l[e] && (r.attrs = [["style", "text-align:" + l[e]]]);
            const n = t.push("inline", "", 0);
            n.content = a[e] ? a[e].trim() : "", n.children = [], t.push("td_close", "td", -1);
          }
          t.push("tr_close", "tr", -1);
        }
        return m && (t.push("tbody_close", "tbody", -1), m[1] = s), t.push("table_close", "table", -1), d[1] = s, t.parentType = p, t.line = s, true;
      }, ["paragraph", "reference"]], ["code", function(t, e, r) {
        if (t.sCount[e] - t.blkIndent < 4)
          return false;
        let n = e + 1, s = n;
        for (;n < r; )
          if (t.isEmpty(n))
            n++;
          else {
            if (!(t.sCount[n] - t.blkIndent >= 4))
              break;
            n++, s = n;
          }
        t.line = s;
        const o = t.push("code_block", "code", 0);
        return o.content = t.getLines(e, s, 4 + t.blkIndent, false) + `
`, o.map = [e, t.line], true;
      }], ["fence", function(t, e, r, n) {
        let s = t.bMarks[e] + t.tShift[e], o = t.eMarks[e];
        if (t.sCount[e] - t.blkIndent >= 4)
          return false;
        if (s + 3 > o)
          return false;
        const i = t.src.charCodeAt(s);
        if (i !== 126 && i !== 96)
          return false;
        let u = s;
        s = t.skipChars(s, i);
        let c = s - u;
        if (c < 3)
          return false;
        const a = t.src.slice(u, s), l = t.src.slice(s, o);
        if (i === 96 && l.indexOf(String.fromCharCode(i)) >= 0)
          return false;
        if (n)
          return true;
        let h = e, p = false;
        for (;(h++, !(h >= r)) && (s = u = t.bMarks[h] + t.tShift[h], o = t.eMarks[h], !(s < o && t.sCount[h] < t.blkIndent)); )
          if (t.src.charCodeAt(s) === i && !(t.sCount[h] - t.blkIndent >= 4 || (s = t.skipChars(s, i), s - u < c || (s = t.skipSpaces(s), s < o)))) {
            p = true;
            break;
          }
        c = t.sCount[e], t.line = h + (p ? 1 : 0);
        const f = t.push("fence", "code", 0);
        return f.info = l, f.content = t.getLines(e + 1, h, c, true), f.markup = a, f.map = [e, t.line], true;
      }, ["paragraph", "reference", "blockquote", "list"]], ["blockquote", function(t, e, r, n) {
        let s = t.bMarks[e] + t.tShift[e], o = t.eMarks[e];
        const i = t.lineMax;
        if (t.sCount[e] - t.blkIndent >= 4)
          return false;
        if (t.src.charCodeAt(s) !== 62)
          return false;
        if (n)
          return true;
        const u = [], c = [], a = [], l = [], h = t.md.block.ruler.getRules("blockquote"), p = t.parentType;
        t.parentType = "blockquote";
        let f, d = false;
        for (f = e;f < r; f++) {
          const e = t.sCount[f] < t.blkIndent;
          if (s = t.bMarks[f] + t.tShift[f], o = t.eMarks[f], s >= o)
            break;
          if (t.src.charCodeAt(s++) === 62 && !e) {
            let e, r, n = t.sCount[f] + 1;
            t.src.charCodeAt(s) === 32 ? (s++, n++, r = false, e = true) : t.src.charCodeAt(s) === 9 ? (e = true, (t.bsCount[f] + n) % 4 == 3 ? (s++, n++, r = false) : r = true) : e = false;
            let i = n;
            for (u.push(t.bMarks[f]), t.bMarks[f] = s;s < o; ) {
              const e = t.src.charCodeAt(s);
              if (!ht(e))
                break;
              e === 9 ? i += 4 - (i + t.bsCount[f] + (r ? 1 : 0)) % 4 : i++, s++;
            }
            d = s >= o, c.push(t.bsCount[f]), t.bsCount[f] = t.sCount[f] + 1 + (e ? 1 : 0), a.push(t.sCount[f]), t.sCount[f] = i - n, l.push(t.tShift[f]), t.tShift[f] = s - t.bMarks[f];
            continue;
          }
          if (d)
            break;
          let n = false;
          for (let s = 0, o = h.length;s < o; s++)
            if (h[s](t, f, r, true)) {
              n = true;
              break;
            }
          if (n) {
            t.lineMax = f, t.blkIndent !== 0 && (u.push(t.bMarks[f]), c.push(t.bsCount[f]), l.push(t.tShift[f]), a.push(t.sCount[f]), t.sCount[f] -= t.blkIndent);
            break;
          }
          u.push(t.bMarks[f]), c.push(t.bsCount[f]), l.push(t.tShift[f]), a.push(t.sCount[f]), t.sCount[f] = -1;
        }
        const m = t.blkIndent;
        t.blkIndent = 0;
        const _ = t.push("blockquote_open", "blockquote", 1);
        _.markup = ">";
        const g = [e, 0];
        _.map = g, t.md.block.tokenize(t, e, f), t.push("blockquote_close", "blockquote", -1).markup = ">", t.lineMax = i, t.parentType = p, g[1] = t.line;
        for (let k = 0;k < l.length; k++)
          t.bMarks[k + e] = u[k], t.tShift[k + e] = l[k], t.sCount[k + e] = a[k], t.bsCount[k + e] = c[k];
        return t.blkIndent = m, true;
      }, ["paragraph", "reference", "blockquote", "list"]], ["hr", function(t, e, r, n) {
        const s = t.eMarks[e];
        if (t.sCount[e] - t.blkIndent >= 4)
          return false;
        let o = t.bMarks[e] + t.tShift[e];
        const i = t.src.charCodeAt(o++);
        if (i !== 42 && i !== 45 && i !== 95)
          return false;
        let u = 1;
        for (;o < s; ) {
          const e = t.src.charCodeAt(o++);
          if (e !== i && !ht(e))
            return false;
          e === i && u++;
        }
        if (u < 3)
          return false;
        if (n)
          return true;
        t.line = e + 1;
        const c = t.push("hr", "hr", 0);
        return c.map = [e, t.line], c.markup = Array(u + 1).join(String.fromCharCode(i)), true;
      }, ["paragraph", "reference", "blockquote", "list"]], ["list", function(t, e, r, n) {
        let s, o, i, u, c = e, a = true;
        if (t.sCount[c] - t.blkIndent >= 4)
          return false;
        if (t.listIndent >= 0 && t.sCount[c] - t.listIndent >= 4 && t.sCount[c] < t.blkIndent)
          return false;
        let l, h, p, f = false;
        if (n && t.parentType === "paragraph" && t.sCount[c] >= t.blkIndent && (f = true), (p = Xt(t, c)) >= 0) {
          if (l = true, i = t.bMarks[c] + t.tShift[c], h = Number(t.src.slice(i, p - 1)), f && h !== 1)
            return false;
        } else {
          if (!((p = Jt(t, c)) >= 0))
            return false;
          l = false;
        }
        if (f && t.skipSpaces(p) >= t.eMarks[c])
          return false;
        if (n)
          return true;
        const d = t.src.charCodeAt(p - 1), m = t.tokens.length;
        l ? (u = t.push("ordered_list_open", "ol", 1), h !== 1 && (u.attrs = [["start", h]])) : u = t.push("bullet_list_open", "ul", 1);
        const _ = [c, 0];
        u.map = _, u.markup = String.fromCharCode(d);
        let g = false;
        const k = t.md.block.ruler.getRules("list"), D = t.parentType;
        for (t.parentType = "list";c < r; ) {
          o = p, s = t.eMarks[c];
          const e = t.sCount[c] + p - (t.bMarks[c] + t.tShift[c]);
          let n = e;
          for (;o < s; ) {
            const e = t.src.charCodeAt(o);
            if (e === 9)
              n += 4 - (n + t.bsCount[c]) % 4;
            else {
              if (e !== 32)
                break;
              n++;
            }
            o++;
          }
          const h = o;
          let f;
          f = h >= s ? 1 : n - e, f > 4 && (f = 1);
          const m = e + f;
          u = t.push("list_item_open", "li", 1), u.markup = String.fromCharCode(d);
          const _ = [c, 0];
          u.map = _, l && (u.info = t.src.slice(i, p - 1));
          const D = t.tight, C = t.tShift[c], y = t.sCount[c], A = t.listIndent;
          if (t.listIndent = t.blkIndent, t.blkIndent = m, t.tight = true, t.tShift[c] = h - t.bMarks[c], t.sCount[c] = n, h >= s && t.isEmpty(c + 1) ? t.line = Math.min(t.line + 2, r) : t.md.block.tokenize(t, c, r, true), t.tight && !g || (a = false), g = t.line - c > 1 && t.isEmpty(t.line - 1), t.blkIndent = t.listIndent, t.listIndent = A, t.tShift[c] = C, t.sCount[c] = y, t.tight = D, u = t.push("list_item_close", "li", -1), u.markup = String.fromCharCode(d), c = t.line, _[1] = c, c >= r)
            break;
          if (t.sCount[c] < t.blkIndent)
            break;
          if (t.sCount[c] - t.blkIndent >= 4)
            break;
          let E = false;
          for (let s = 0, o = k.length;s < o; s++)
            if (k[s](t, c, r, true)) {
              E = true;
              break;
            }
          if (E)
            break;
          if (l) {
            if (p = Xt(t, c), p < 0)
              break;
            i = t.bMarks[c] + t.tShift[c];
          } else if (p = Jt(t, c), p < 0)
            break;
          if (d !== t.src.charCodeAt(p - 1))
            break;
        }
        return u = l ? t.push("ordered_list_close", "ol", -1) : t.push("bullet_list_close", "ul", -1), u.markup = String.fromCharCode(d), _[1] = c, t.line = c, t.parentType = D, a && function(t, e) {
          const r = t.level + 2;
          for (let n = e + 2, s = t.tokens.length - 2;n < s; n++)
            t.tokens[n].level === r && t.tokens[n].type === "paragraph_open" && (t.tokens[n + 2].hidden = true, t.tokens[n].hidden = true, n += 2);
        }(t, m), true;
      }, ["paragraph", "reference", "blockquote"]], ["reference", function(t, e, r, n) {
        let s = t.bMarks[e] + t.tShift[e], o = t.eMarks[e], i = e + 1;
        if (t.sCount[e] - t.blkIndent >= 4)
          return false;
        if (t.src.charCodeAt(s) !== 91)
          return false;
        function u(e) {
          const r = t.lineMax;
          if (e >= r || t.isEmpty(e))
            return null;
          let n = false;
          if (t.sCount[e] - t.blkIndent > 3 && (n = true), t.sCount[e] < 0 && (n = true), !n) {
            const n = t.md.block.ruler.getRules("reference"), s = t.parentType;
            t.parentType = "reference";
            let o = false;
            for (let i = 0, u = n.length;i < u; i++)
              if (n[i](t, e, r, true)) {
                o = true;
                break;
              }
            if (t.parentType = s, o)
              return null;
          }
          const s = t.bMarks[e] + t.tShift[e], o = t.eMarks[e];
          return t.src.slice(s, o + 1);
        }
        let c = t.src.slice(s, o + 1);
        o = c.length;
        let a = -1;
        for (s = 1;s < o; s++) {
          const t = c.charCodeAt(s);
          if (t === 91)
            return false;
          if (t === 93) {
            a = s;
            break;
          }
          if (t === 10) {
            const t = u(i);
            t !== null && (c += t, o = c.length, i++);
          } else if (t === 92 && (s++, s < o && c.charCodeAt(s) === 10)) {
            const t = u(i);
            t !== null && (c += t, o = c.length, i++);
          }
        }
        if (a < 0 || c.charCodeAt(a + 1) !== 58)
          return false;
        for (s = a + 2;s < o; s++) {
          const t = c.charCodeAt(s);
          if (t === 10) {
            const t = u(i);
            t !== null && (c += t, o = c.length, i++);
          } else if (!ht(t))
            break;
        }
        const l = t.md.helpers.parseLinkDestination(c, s, o);
        if (!l.ok)
          return false;
        const h = t.md.normalizeLink(l.str);
        if (!t.md.validateLink(h))
          return false;
        s = l.pos;
        const p = s, f = i, d = s;
        for (;s < o; s++) {
          const t = c.charCodeAt(s);
          if (t === 10) {
            const t = u(i);
            t !== null && (c += t, o = c.length, i++);
          } else if (!ht(t))
            break;
        }
        let m, _ = t.md.helpers.parseLinkTitle(c, s, o);
        for (;_.can_continue; ) {
          const e = u(i);
          if (e === null)
            break;
          c += e, s = o, o = c.length, i++, _ = t.md.helpers.parseLinkTitle(c, s, o, _);
        }
        for (s < o && d !== s && _.ok ? (m = _.str, s = _.pos) : (m = "", s = p, i = f);s < o && ht(c.charCodeAt(s)); )
          s++;
        if (s < o && c.charCodeAt(s) !== 10 && m)
          for (m = "", s = p, i = f;s < o && ht(c.charCodeAt(s)); )
            s++;
        if (s < o && c.charCodeAt(s) !== 10)
          return false;
        const g = _t(c.slice(1, a));
        return !!g && (n || (t.env.references === undefined && (t.env.references = {}), t.env.references[g] === undefined && (t.env.references[g] = { title: m, href: h }), t.line = i), true);
      }], ["html_block", function(t, e, r, n) {
        let s = t.bMarks[e] + t.tShift[e], o = t.eMarks[e];
        if (t.sCount[e] - t.blkIndent >= 4)
          return false;
        if (!t.md.options.html)
          return false;
        if (t.src.charCodeAt(s) !== 60)
          return false;
        let i = t.src.slice(s, o), u = 0;
        for (;u < te.length && !te[u][0].test(i); u++)
          ;
        if (u === te.length)
          return false;
        if (n)
          return te[u][2];
        let c = e + 1;
        const a = te[u][1].test("");
        if (!te[u][1].test(i)) {
          for (;c < r && (!(t.sCount[c] < t.blkIndent) || !a && t.isEmpty(c)); c++)
            if (s = t.bMarks[c] + t.tShift[c], o = t.eMarks[c], i = t.src.slice(s, o), te[u][1].test(i)) {
              i.length !== 0 && c++;
              break;
            }
        }
        t.line = c;
        const l = t.push("html_block", "", 0);
        return l.map = [e, c], l.content = t.getLines(e, c, t.blkIndent, true), true;
      }, ["paragraph", "reference", "blockquote"]], ["heading", function(t, e, r, n) {
        let s = t.bMarks[e] + t.tShift[e], o = t.eMarks[e];
        if (t.sCount[e] - t.blkIndent >= 4)
          return false;
        let i = t.src.charCodeAt(s);
        if (i !== 35 || s >= o)
          return false;
        let u = 1;
        for (i = t.src.charCodeAt(++s);i === 35 && s < o && u <= 6; )
          u++, i = t.src.charCodeAt(++s);
        if (u > 6 || s < o && !ht(i))
          return false;
        if (n)
          return true;
        o = t.skipSpacesBack(o, s);
        const c = t.skipCharsBack(o, 35, s);
        c > s && ht(t.src.charCodeAt(c - 1)) && (o = c), t.line = e + 1;
        const a = t.push("heading_open", "h" + String(u), 1);
        a.markup = "########".slice(0, u), a.map = [e, t.line];
        const l = t.push("inline", "", 0);
        return l.content = kt(t.src.slice(s, o)), l.map = [e, t.line], l.children = [], t.push("heading_close", "h" + String(u), -1).markup = "########".slice(0, u), true;
      }, ["paragraph", "reference", "blockquote"]], ["lheading", function(t, e, r) {
        const n = t.md.block.ruler.getRules("paragraph");
        if (t.sCount[e] - t.blkIndent >= 4)
          return false;
        const s = t.parentType;
        t.parentType = "paragraph";
        let o, i = 0, u = e + 1;
        for (;u < r && !t.isEmpty(u); u++) {
          if (t.sCount[u] - t.blkIndent > 3)
            continue;
          if (t.sCount[u] >= t.blkIndent) {
            let e = t.bMarks[u] + t.tShift[u];
            const r = t.eMarks[u];
            if (e < r && (o = t.src.charCodeAt(e), (o === 45 || o === 61) && (e = t.skipChars(e, o), e = t.skipSpaces(e), e >= r))) {
              i = o === 61 ? 1 : 2;
              break;
            }
          }
          if (t.sCount[u] < 0)
            continue;
          let e = false;
          for (let s = 0, o = n.length;s < o; s++)
            if (n[s](t, u, r, true)) {
              e = true;
              break;
            }
          if (e)
            break;
        }
        if (!i)
          return t.parentType = s, false;
        const c = kt(t.getLines(e, u, t.blkIndent, false));
        t.line = u + 1;
        const a = t.push("heading_open", "h" + String(i), 1);
        a.markup = String.fromCharCode(o), a.map = [e, t.line];
        const l = t.push("inline", "", 0);
        return l.content = c, l.map = [e, t.line - 1], l.children = [], t.push("heading_close", "h" + String(i), -1).markup = String.fromCharCode(o), t.parentType = s, true;
      }], ["paragraph", function(t, e, r) {
        const n = t.md.block.ruler.getRules("paragraph"), s = t.parentType;
        let o = e + 1;
        for (t.parentType = "paragraph";o < r && !t.isEmpty(o); o++) {
          if (t.sCount[o] - t.blkIndent > 3)
            continue;
          if (t.sCount[o] < 0)
            continue;
          let e = false;
          for (let s = 0, i = n.length;s < i; s++)
            if (n[s](t, o, r, true)) {
              e = true;
              break;
            }
          if (e)
            break;
        }
        const i = kt(t.getLines(e, o, t.blkIndent, false));
        t.line = o, t.push("paragraph_open", "p", 1).map = [e, t.line];
        const u = t.push("inline", "", 0);
        return u.content = i, u.map = [e, t.line], u.children = [], t.push("paragraph_close", "p", -1), t.parentType = s, true;
      }]];
      function re() {
        this.ruler = new xt;
        for (let t = 0;t < ee.length; t++)
          this.ruler.push(ee[t][0], ee[t][1], { alt: (ee[t][2] || []).slice() });
      }
      function ne(t, e, r, n) {
        this.src = t, this.env = r, this.md = e, this.tokens = n, this.tokens_meta = Array(n.length), this.pos = 0, this.posMax = this.src.length, this.level = 0, this.pending = "", this.pendingLevel = 0, this.cache = {}, this.delimiters = [], this._prev_delimiters = [], this.backticks = {}, this.backticksScanned = false, this.linkLevel = 0;
      }
      function se(t) {
        switch (t) {
          case 10:
          case 33:
          case 35:
          case 36:
          case 37:
          case 38:
          case 42:
          case 43:
          case 45:
          case 58:
          case 60:
          case 61:
          case 62:
          case 64:
          case 91:
          case 92:
          case 93:
          case 94:
          case 95:
          case 96:
          case 123:
          case 125:
          case 126:
            return true;
          default:
            return false;
        }
      }
      function oe(t) {
        return t >= 65 && t <= 90 || t >= 97 && t <= 122 || t >= 48 && t <= 57 || t === 43 || t === 45 || t === 46;
      }
      re.prototype.tokenize = function(t, e, r) {
        const n = this.ruler.getRules(""), s = n.length, o = t.md.options.maxNesting;
        let i = e, u = false;
        for (;i < r && (t.line = i = t.skipEmptyLines(i), !(i >= r)) && !(t.sCount[i] < t.blkIndent); ) {
          if (t.level >= o) {
            t.line = r;
            break;
          }
          const e = t.line;
          let c = false;
          for (let o = 0;o < s; o++)
            if (c = n[o](t, i, r, false), c) {
              if (e >= t.line)
                throw new Error("block rule didn't increment state.line");
              break;
            }
          if (!c)
            throw new Error("none of the block rules matched");
          t.tight = !u, t.isEmpty(t.line - 1) && (u = true), i = t.line, i < r && t.isEmpty(i) && (u = true, i++, t.line = i);
        }
      }, re.prototype.parse = function(t, e, r, n) {
        if (!t)
          return;
        const s = new this.State(t, e, r, n);
        this.tokenize(s, s.line, s.lineMax);
      }, re.prototype.State = Gt, ne.prototype.pushPending = function() {
        const t = new vt("text", "", 0);
        return t.content = this.pending, t.level = this.pendingLevel, this.tokens.push(t), this.pending = "", t;
      }, ne.prototype.push = function(t, e, r) {
        this.pending && this.pushPending();
        const n = new vt(t, e, r);
        let s = null;
        return r < 0 && (this.level--, this.delimiters = this._prev_delimiters.pop()), n.level = this.level, r > 0 && (this.level++, this._prev_delimiters.push(this.delimiters), this.delimiters = [], s = { delimiters: this.delimiters }), this.pendingLevel = this.level, this.tokens.push(n), this.tokens_meta.push(s), n;
      }, ne.prototype.scanDelims = function(t, e) {
        const r = this.posMax, n = this.src.charCodeAt(t);
        let s;
        if (t === 0)
          s = 32;
        else if (t === 1)
          s = this.src.charCodeAt(0), (63488 & s) == 55296 && (s = 65533);
        else if (s = this.src.charCodeAt(t - 1), (64512 & s) == 56320) {
          const e = this.src.charCodeAt(t - 2);
          s = (64512 & e) == 55296 ? 65536 + (e - 55296 << 10) + (s - 56320) : 65533;
        } else
          (64512 & s) == 55296 && (s = 65533);
        let o = t;
        for (;o < r && this.src.charCodeAt(o) === n; )
          o++;
        const i = o - t;
        let u = o < r ? this.src.charCodeAt(o) : 32;
        if ((64512 & u) == 55296) {
          const t = this.src.charCodeAt(o + 1);
          u = (64512 & t) == 56320 ? 65536 + (u - 55296 << 10) + (t - 56320) : 65533;
        } else
          (64512 & u) == 56320 && (u = 65533);
        const c = mt(s) || dt(s), a = mt(u) || dt(u), l = pt(s), h = pt(u), p = !h && (!a || l || c), f = !l && (!c || h || a);
        return { can_open: p && (e || !f || c), can_close: f && (e || !p || a), length: i };
      }, ne.prototype.Token = vt;
      var ie = [];
      for (let er = 0;er < 256; er++)
        ie.push(0);
      function ue(t, e) {
        let r;
        const n = [], s = e.length;
        for (let o = 0;o < s; o++) {
          const s = e[o];
          if (s.marker !== 126)
            continue;
          if (s.end === -1)
            continue;
          const i = e[s.end];
          r = t.tokens[s.token], r.type = "s_open", r.tag = "s", r.nesting = 1, r.markup = "~~", r.content = "", r = t.tokens[i.token], r.type = "s_close", r.tag = "s", r.nesting = -1, r.markup = "~~", r.content = "", t.tokens[i.token - 1].type === "text" && t.tokens[i.token - 1].content === "~" && n.push(i.token - 1);
        }
        for (;n.length; ) {
          const e = n.pop();
          let s = e + 1;
          for (;s < t.tokens.length && t.tokens[s].type === "s_close"; )
            s++;
          s--, e !== s && (r = t.tokens[s], t.tokens[s] = t.tokens[e], t.tokens[e] = r);
        }
      }
      "\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach(function(t) {
        ie[t.charCodeAt(0)] = 1;
      });
      var ce = { tokenize: function(t, e) {
        const r = t.pos, n = t.src.charCodeAt(r);
        if (e)
          return false;
        if (n !== 126)
          return false;
        const s = t.scanDelims(t.pos, true);
        let o = s.length;
        const i = String.fromCharCode(n);
        if (o < 2)
          return false;
        let u;
        o % 2 && (u = t.push("text", "", 0), u.content = i, o--);
        for (let c = 0;c < o; c += 2)
          u = t.push("text", "", 0), u.content = i + i, t.delimiters.push({ marker: n, length: 0, token: t.tokens.length - 1, end: -1, open: s.can_open, close: s.can_close });
        return t.pos += s.length, true;
      }, postProcess: function(t) {
        const e = t.tokens_meta, r = t.tokens_meta.length;
        ue(t, t.delimiters);
        for (let n = 0;n < r; n++)
          e[n] && e[n].delimiters && ue(t, e[n].delimiters);
      } };
      function ae(t, e) {
        for (let r = e.length - 1;r >= 0; r--) {
          const n = e[r];
          if (n.marker !== 95 && n.marker !== 42)
            continue;
          if (n.end === -1)
            continue;
          const s = e[n.end], o = r > 0 && e[r - 1].end === n.end + 1 && e[r - 1].marker === n.marker && e[r - 1].token === n.token - 1 && e[n.end + 1].token === s.token + 1, i = String.fromCharCode(n.marker), u = t.tokens[n.token];
          u.type = o ? "strong_open" : "em_open", u.tag = o ? "strong" : "em", u.nesting = 1, u.markup = o ? i + i : i, u.content = "";
          const c = t.tokens[s.token];
          c.type = o ? "strong_close" : "em_close", c.tag = o ? "strong" : "em", c.nesting = -1, c.markup = o ? i + i : i, c.content = "", o && (t.tokens[e[r - 1].token].content = "", t.tokens[e[n.end + 1].token].content = "", r--);
        }
      }
      var le = { tokenize: function(t, e) {
        const r = t.pos, n = t.src.charCodeAt(r);
        if (e)
          return false;
        if (n !== 95 && n !== 42)
          return false;
        const s = t.scanDelims(t.pos, n === 42);
        for (let o = 0;o < s.length; o++) {
          t.push("text", "", 0).content = String.fromCharCode(n), t.delimiters.push({ marker: n, length: s.length, token: t.tokens.length - 1, end: -1, open: s.can_open, close: s.can_close });
        }
        return t.pos += s.length, true;
      }, postProcess: function(t) {
        const e = t.tokens_meta, r = t.tokens_meta.length;
        ae(t, t.delimiters);
        for (let n = 0;n < r; n++)
          e[n] && e[n].delimiters && ae(t, e[n].delimiters);
      } };
      var he = /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/, pe = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;
      var fe = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i, de = /^&([a-z][a-z0-9]{1,31});/i;
      function me(t) {
        const e = {}, r = t.length;
        if (!r)
          return;
        let n = 0, s = -2;
        const o = [];
        for (let i = 0;i < r; i++) {
          const r = t[i];
          if (o.push(0), t[n].marker === r.marker && s === r.token - 1 || (n = i), s = r.token, r.length = r.length || 0, !r.close)
            continue;
          e.hasOwnProperty(r.marker) || (e[r.marker] = [-1, -1, -1, -1, -1, -1]);
          const u = e[r.marker][(r.open ? 3 : 0) + r.length % 3];
          let c = n - o[n] - 1, a = c;
          for (;c > u; c -= o[c] + 1) {
            const e = t[c];
            if (e.marker === r.marker && (e.open && e.end < 0)) {
              let n = false;
              if ((e.close || r.open) && (e.length + r.length) % 3 == 0 && (e.length % 3 == 0 && r.length % 3 == 0 || (n = true)), !n) {
                const n = c > 0 && !t[c - 1].open ? o[c - 1] + 1 : 0;
                o[i] = i - c + n, o[c] = n, r.open = false, e.end = i, e.close = false, a = -1, s = -2;
                break;
              }
            }
          }
          a !== -1 && (e[r.marker][(r.open ? 3 : 0) + (r.length || 0) % 3] = a);
        }
      }
      var _e = [["text", function(t, e) {
        let r = t.pos;
        for (;r < t.posMax && !se(t.src.charCodeAt(r)); )
          r++;
        return r !== t.pos && (e || (t.pending += t.src.slice(t.pos, r)), t.pos = r, true);
      }], ["linkify", function(t, e) {
        if (!t.md.options.linkify)
          return false;
        if (t.linkLevel > 0)
          return false;
        const r = t.pos;
        if (r + 3 > t.posMax)
          return false;
        if (t.src.charCodeAt(r) !== 58)
          return false;
        if (t.src.charCodeAt(r + 1) !== 47)
          return false;
        if (t.src.charCodeAt(r + 2) !== 47)
          return false;
        const n = r - Math.min(10, t.pending.length, r);
        let s = r;
        for (;s > n && oe(t.src.charCodeAt(s - 1)); )
          s--;
        if (s === r || !function(t) {
          return t >= 65 && t <= 90 || t >= 97 && t <= 122;
        }(t.src.charCodeAt(s)))
          return false;
        const o = r - s, i = t.md.linkify.matchAtStart(t.src.slice(s));
        if (!i)
          return false;
        let u = i.url;
        if (u.length <= o)
          return false;
        let c = u.length;
        for (;c > 0 && u.charCodeAt(c - 1) === 42; )
          c--;
        c !== u.length && (u = u.slice(0, c));
        const a = t.md.normalizeLink(u);
        if (!t.md.validateLink(a))
          return false;
        if (!e) {
          t.pending = t.pending.slice(0, -o);
          const e = t.push("link_open", "a", 1);
          e.attrs = [["href", a]], e.markup = "linkify", e.info = "auto";
          t.push("text", "", 0).content = t.md.normalizeLinkText(u);
          const r = t.push("link_close", "a", -1);
          r.markup = "linkify", r.info = "auto";
        }
        return t.pos += u.length - o, true;
      }], ["newline", function(t, e) {
        let r = t.pos;
        if (t.src.charCodeAt(r) !== 10)
          return false;
        const n = t.pending.length - 1, s = t.posMax;
        if (!e)
          if (n >= 0 && t.pending.charCodeAt(n) === 32)
            if (n >= 1 && t.pending.charCodeAt(n - 1) === 32) {
              let e = n - 1;
              for (;e >= 1 && t.pending.charCodeAt(e - 1) === 32; )
                e--;
              t.pending = t.pending.slice(0, e), t.push("hardbreak", "br", 0);
            } else
              t.pending = t.pending.slice(0, -1), t.push("softbreak", "br", 0);
          else
            t.push("softbreak", "br", 0);
        for (r++;r < s && ht(t.src.charCodeAt(r)); )
          r++;
        return t.pos = r, true;
      }], ["escape", function(t, e) {
        let r = t.pos;
        const n = t.posMax;
        if (t.src.charCodeAt(r) !== 92)
          return false;
        if (r++, r >= n)
          return false;
        let s = t.src.charCodeAt(r);
        if (s === 10) {
          for (e || t.push("hardbreak", "br", 0), r++;r < n && (s = t.src.charCodeAt(r), ht(s)); )
            r++;
          return t.pos = r, true;
        }
        if (s === 32) {
          if (!e) {
            const e = t.push("text_special", "", 0);
            e.content = "\\", e.markup = "\\", e.info = "escape";
          }
          return t.pos = r, true;
        }
        let o = t.src[r];
        if (s >= 55296 && s <= 56319 && r + 1 < n) {
          const e = t.src.charCodeAt(r + 1);
          e >= 56320 && e <= 57343 && (o += t.src[r + 1], r++);
        }
        const i = "\\" + o;
        if (!e) {
          const e = t.push("text_special", "", 0);
          s < 256 && ie[s] !== 0 ? e.content = o : e.content = i, e.markup = i, e.info = "escape";
        }
        return t.pos = r + 1, true;
      }], ["backticks", function(t, e) {
        let r = t.pos;
        if (t.src.charCodeAt(r) !== 96)
          return false;
        const n = r;
        r++;
        const s = t.posMax;
        for (;r < s && t.src.charCodeAt(r) === 96; )
          r++;
        const o = t.src.slice(n, r), i = o.length;
        if (t.backticksScanned && (t.backticks[i] || 0) <= n)
          return e || (t.pending += o), t.pos += i, true;
        let u, c = r;
        for (;(u = t.src.indexOf("`", c)) !== -1; ) {
          for (c = u + 1;c < s && t.src.charCodeAt(c) === 96; )
            c++;
          const n = c - u;
          if (n === i) {
            if (!e) {
              const e = t.push("code_inline", "code", 0);
              e.markup = o, e.content = t.src.slice(r, u).replace(/\n/g, " ").replace(/^ (.+) $/, "$1");
            }
            return t.pos = c, true;
          }
          t.backticks[n] = u;
        }
        return t.backticksScanned = true, e || (t.pending += o), t.pos += i, true;
      }], ["strikethrough", ce.tokenize], ["emphasis", le.tokenize], ["link", function(t, e) {
        let r, n, s, o, i = "", u = "", c = t.pos, a = true;
        if (t.src.charCodeAt(t.pos) !== 91)
          return false;
        const { pos: l, posMax: h } = t, p = t.pos + 1, f = t.md.helpers.parseLinkLabel(t, t.pos, true);
        if (f < 0)
          return false;
        let d = f + 1;
        if (d < h && t.src.charCodeAt(d) === 40) {
          for (a = false, d++;d < h && (r = t.src.charCodeAt(d), ht(r) || r === 10); d++)
            ;
          if (d >= h)
            return false;
          if (c = d, s = t.md.helpers.parseLinkDestination(t.src, d, t.posMax), s.ok) {
            for (i = t.md.normalizeLink(s.str), t.md.validateLink(i) ? d = s.pos : i = "", c = d;d < h && (r = t.src.charCodeAt(d), ht(r) || r === 10); d++)
              ;
            if (s = t.md.helpers.parseLinkTitle(t.src, d, t.posMax), d < h && c !== d && s.ok)
              for (u = s.str, d = s.pos;d < h && (r = t.src.charCodeAt(d), ht(r) || r === 10); d++)
                ;
          }
          (d >= h || t.src.charCodeAt(d) !== 41) && (a = true), d++;
        }
        if (a) {
          if (t.env.references === undefined)
            return false;
          if (d < h && t.src.charCodeAt(d) === 91 ? (c = d + 1, d = t.md.helpers.parseLinkLabel(t, d), d >= 0 ? n = t.src.slice(c, d++) : d = f + 1) : d = f + 1, n || (n = t.src.slice(p, f)), o = t.env.references[_t(n)], !o)
            return t.pos = l, false;
          i = o.href, u = o.title;
        }
        if (!e) {
          t.pos = p, t.posMax = f;
          const e = [["href", i]];
          t.push("link_open", "a", 1).attrs = e, u && e.push(["title", u]), t.linkLevel++, t.md.inline.tokenize(t), t.linkLevel--, t.push("link_close", "a", -1);
        }
        return t.pos = d, t.posMax = h, true;
      }], ["image", function(t, e) {
        let r, n, s, o, i, u, c, a, l = "";
        const { pos: h, posMax: p } = t;
        if (t.src.charCodeAt(t.pos) !== 33)
          return false;
        if (t.src.charCodeAt(t.pos + 1) !== 91)
          return false;
        const f = t.pos + 2, d = t.md.helpers.parseLinkLabel(t, t.pos + 1, false);
        if (d < 0)
          return false;
        if (o = d + 1, o < p && t.src.charCodeAt(o) === 40) {
          for (o++;o < p && (r = t.src.charCodeAt(o), ht(r) || r === 10); o++)
            ;
          if (o >= p)
            return false;
          for (a = o, u = t.md.helpers.parseLinkDestination(t.src, o, t.posMax), u.ok && (l = t.md.normalizeLink(u.str), t.md.validateLink(l) ? o = u.pos : l = ""), a = o;o < p && (r = t.src.charCodeAt(o), ht(r) || r === 10); o++)
            ;
          if (u = t.md.helpers.parseLinkTitle(t.src, o, t.posMax), o < p && a !== o && u.ok)
            for (c = u.str, o = u.pos;o < p && (r = t.src.charCodeAt(o), ht(r) || r === 10); o++)
              ;
          else
            c = "";
          if (o >= p || t.src.charCodeAt(o) !== 41)
            return t.pos = h, false;
          o++;
        } else {
          if (t.env.references === undefined)
            return false;
          if (o < p && t.src.charCodeAt(o) === 91 ? (a = o + 1, o = t.md.helpers.parseLinkLabel(t, o), o >= 0 ? s = t.src.slice(a, o++) : o = d + 1) : o = d + 1, s || (s = t.src.slice(f, d)), i = t.env.references[_t(s)], !i)
            return t.pos = h, false;
          l = i.href, c = i.title;
        }
        if (!e) {
          n = t.src.slice(f, d);
          const e = [];
          t.md.inline.parse(n, t.md, t.env, e);
          const r = t.push("image", "img", 0), s = [["src", l], ["alt", ""]];
          r.attrs = s, r.children = e, r.content = n, c && s.push(["title", c]);
        }
        return t.pos = o, t.posMax = p, true;
      }], ["autolink", function(t, e) {
        let r = t.pos;
        if (t.src.charCodeAt(r) !== 60)
          return false;
        const { pos: n, posMax: s } = t;
        for (;; ) {
          if (++r >= s)
            return false;
          const e = t.src.charCodeAt(r);
          if (e === 60)
            return false;
          if (e === 62)
            break;
        }
        const o = t.src.slice(n + 1, r);
        if (pe.test(o)) {
          const r = t.md.normalizeLink(o);
          if (!t.md.validateLink(r))
            return false;
          if (!e) {
            const e = t.push("link_open", "a", 1);
            e.attrs = [["href", r]], e.markup = "autolink", e.info = "auto";
            t.push("text", "", 0).content = t.md.normalizeLinkText(o);
            const n = t.push("link_close", "a", -1);
            n.markup = "autolink", n.info = "auto";
          }
          return t.pos += o.length + 2, true;
        }
        if (he.test(o)) {
          const r = t.md.normalizeLink("mailto:" + o);
          if (!t.md.validateLink(r))
            return false;
          if (!e) {
            const e = t.push("link_open", "a", 1);
            e.attrs = [["href", r]], e.markup = "autolink", e.info = "auto";
            t.push("text", "", 0).content = t.md.normalizeLinkText(o);
            const n = t.push("link_close", "a", -1);
            n.markup = "autolink", n.info = "auto";
          }
          return t.pos += o.length + 2, true;
        }
        return false;
      }], ["html_inline", function(t, e) {
        if (!t.md.options.html)
          return false;
        const { posMax: r, pos: n } = t;
        if (t.src.charCodeAt(n) !== 60 || n + 2 >= r)
          return false;
        const s = t.src.charCodeAt(n + 1);
        if (s !== 33 && s !== 63 && s !== 47 && !function(t) {
          const e = 32 | t;
          return e >= 97 && e <= 122;
        }(s))
          return false;
        const o = t.src.slice(n).match(Yt);
        if (!o)
          return false;
        if (!e) {
          const e = t.push("html_inline", "", 0);
          e.content = o[0], i = e.content, /^<a[>\s]/i.test(i) && t.linkLevel++, function(t) {
            return /^<\/a\s*>/i.test(t);
          }(e.content) && t.linkLevel--;
        }
        var i;
        return t.pos += o[0].length, true;
      }], ["entity", function(t, e) {
        const { pos: r, posMax: n } = t;
        if (t.src.charCodeAt(r) !== 38)
          return false;
        if (r + 1 >= n)
          return false;
        if (t.src.charCodeAt(r + 1) === 35) {
          const n = t.src.slice(r).match(fe);
          if (n) {
            if (!e) {
              const e = n[1][0].toLowerCase() === "x" ? parseInt(n[1].slice(1), 16) : parseInt(n[1], 10), r = t.push("text_special", "", 0);
              r.content = J(e) ? X(e) : X(65533), r.markup = n[0], r.info = "entity";
            }
            return t.pos += n[0].length, true;
          }
        } else {
          const n = t.src.slice(r).match(de);
          if (n) {
            const r = (s = n[0], j(s, T.Strict));
            if (r !== n[0]) {
              if (!e) {
                const e = t.push("text_special", "", 0);
                e.content = r, e.markup = n[0], e.info = "entity";
              }
              return t.pos += n[0].length, true;
            }
          }
        }
        var s;
        return false;
      }]], ge = [["balance_pairs", function(t) {
        const e = t.tokens_meta, r = t.tokens_meta.length;
        me(t.delimiters);
        for (let n = 0;n < r; n++)
          e[n] && e[n].delimiters && me(e[n].delimiters);
      }], ["strikethrough", ce.postProcess], ["emphasis", le.postProcess], ["fragments_join", function(t) {
        let e, r, n = 0;
        const s = t.tokens, o = t.tokens.length;
        for (e = r = 0;e < o; e++)
          s[e].nesting < 0 && n--, s[e].level = n, s[e].nesting > 0 && n++, s[e].type === "text" && e + 1 < o && s[e + 1].type === "text" ? s[e + 1].content = s[e].content + s[e + 1].content : (e !== r && (s[r] = s[e]), r++);
        e !== r && (s.length = r);
      }]];
      function ke() {
        this.ruler = new xt;
        for (let t = 0;t < _e.length; t++)
          this.ruler.push(_e[t][0], _e[t][1]);
        this.ruler2 = new xt;
        for (let t = 0;t < ge.length; t++)
          this.ruler2.push(ge[t][0], ge[t][1]);
      }
      function De(t) {
        return Array.prototype.slice.call(arguments, 1).forEach(function(e) {
          e && Object.keys(e).forEach(function(r) {
            t[r] = e[r];
          });
        }), t;
      }
      function Ce(t) {
        return Object.prototype.toString.call(t);
      }
      function ye(t) {
        return Ce(t) === "[object Function]";
      }
      function Ae(t) {
        return t.replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
      }
      ke.prototype.skipToken = function(t) {
        const e = t.pos, r = this.ruler.getRules(""), n = r.length, s = t.md.options.maxNesting, o = t.cache;
        if (o[e] !== undefined)
          return void (t.pos = o[e]);
        let i = false;
        if (t.level < s) {
          for (let u = 0;u < n; u++)
            if (t.level++, i = r[u](t, true), t.level--, i) {
              if (e >= t.pos)
                throw new Error("inline rule didn't increment state.pos");
              break;
            }
        } else
          t.pos = t.posMax;
        i || t.pos++, o[e] = t.pos;
      }, ke.prototype.tokenize = function(t) {
        const e = this.ruler.getRules(""), r = e.length, n = t.posMax, s = t.md.options.maxNesting;
        for (;t.pos < n; ) {
          const o = t.pos;
          let i = false;
          if (t.level < s) {
            for (let n = 0;n < r; n++)
              if (i = e[n](t, false), i) {
                if (o >= t.pos)
                  throw new Error("inline rule didn't increment state.pos");
                break;
              }
          }
          if (i) {
            if (t.pos >= n)
              break;
          } else
            t.pending += t.src[t.pos++];
        }
        t.pending && t.pushPending();
      }, ke.prototype.parse = function(t, e, r, n) {
        const s = new this.State(t, e, r, n);
        this.tokenize(s);
        const o = this.ruler2.getRules(""), i = o.length;
        for (let u = 0;u < i; u++)
          o[u](s);
      }, ke.prototype.State = ne;
      var Ee = { fuzzyLink: true, fuzzyEmail: true, fuzzyIP: false };
      var be = { "http:": { validate: function(t, e, r) {
        const n = t.slice(e);
        return r.re.http || (r.re.http = new RegExp(`^\\/\\/${r.re.src_auth}${r.re.src_host_port_strict}${r.re.src_path}`, "i")), r.re.http.test(n) ? n.match(r.re.http)[0].length : 0;
      } }, "https:": "http:", "ftp:": "http:", "//": { validate: function(t, e, r) {
        const n = t.slice(e);
        return r.re.no_http || (r.re.no_http = new RegExp("^" + r.re.src_auth + `(?:localhost|(?:(?:${r.re.src_domain})\\.)+${r.re.src_domain_root})` + r.re.src_port + r.re.src_host_terminator + r.re.src_path, "i")), r.re.no_http.test(n) ? e >= 3 && t[e - 3] === ":" || e >= 3 && t[e - 3] === "/" ? 0 : n.match(r.re.no_http)[0].length : 0;
      } }, "mailto:": { validate: function(t, e, r) {
        const n = t.slice(e);
        return r.re.mailto || (r.re.mailto = new RegExp(`^${r.re.src_email_name}@${r.re.src_host_strict}`, "i")), r.re.mailto.test(n) ? n.match(r.re.mailto)[0].length : 0;
      } } }, Fe = "biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф".split("|");
      function xe(t) {
        const e = t.re = function(t) {
          const e = {};
          t = t || {}, e.src_Any = E.source, e.src_Cc = b.source, e.src_Z = w.source, e.src_P = x.source, e.src_ZPCc = [e.src_Z, e.src_P, e.src_Cc].join("|"), e.src_ZCc = [e.src_Z, e.src_Cc].join("|");
          const r = "[><｜]";
          return e.src_pseudo_letter = `(?:(?!${r}|${e.src_ZPCc})${e.src_Any})`, e.src_ip4 = "(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)", e.src_auth = `(?:(?:(?!${e.src_ZCc}|[@/\\[\\]()]).){1,50}@)?`, e.src_port = "(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?", e.src_host_terminator = `(?=$|${r}|${e.src_ZPCc})(?!${t["---"] ? "-(?!--)|" : "-|"}_|:\\d|\\.-|\\.(?!$|${e.src_ZPCc}))`, e.src_path = `(?:[/?#](?:(?!${e.src_ZCc}|${r}|[()[\\]{}.,"'?!\\-;]).|\\[(?:(?!${e.src_ZCc}|\\]).)*\\]|\\((?:(?!${e.src_ZCc}|[)]).)*\\)|\\{(?:(?!${e.src_ZCc}|[}]).)*\\}|\\"(?:(?!${e.src_ZCc}|["]).)+\\"|\\'(?:(?!${e.src_ZCc}|[']).)+\\'|\\'(?=${e.src_pseudo_letter}|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!${e.src_ZCc}|[.]|$)|` + (t["---"] ? "\\-(?!--(?:[^-]|$))(?:-*)|" : "\\-+|") + `,(?!${e.src_ZCc}|$)|;(?!${e.src_ZCc}|$)|\\!+(?!${e.src_ZCc}|[!]|$)|\\?(?!${e.src_ZCc}|[?]|$))+|\\/)?`, e.src_email_name = "[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\\"\\.a-zA-Z0-9_]{0,63}", e.src_xn = "xn--[a-z0-9\\-]{1,59}", e.src_domain_root = "(?:" + e.src_xn + `|${e.src_pseudo_letter}{1,63})`, e.src_domain = "(?:" + e.src_xn + `|(?:${e.src_pseudo_letter})|(?:${e.src_pseudo_letter}(?:-|${e.src_pseudo_letter}){0,61}${e.src_pseudo_letter}))`, e.src_host = `(?:(?:(?:(?:${e.src_domain})\\.)*${e.src_domain}))`, e.tpl_host_fuzzy = "(?:" + e.src_ip4 + `|(?:(?:(?:${e.src_domain})\\.)+(?:%TLDS%)))`, e.tpl_host_no_ip_fuzzy = `(?:(?:(?:${e.src_domain})\\.)+(?:%TLDS%))`, e.src_host_strict = e.src_host + e.src_host_terminator, e.tpl_host_fuzzy_strict = e.tpl_host_fuzzy + e.src_host_terminator, e.src_host_port_strict = e.src_host + e.src_port + e.src_host_terminator, e.tpl_host_port_fuzzy_strict = e.tpl_host_fuzzy + e.src_port + e.src_host_terminator, e.tpl_host_port_no_ip_fuzzy_strict = e.tpl_host_no_ip_fuzzy + e.src_port + e.src_host_terminator, e.tpl_host_fuzzy_test = `localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:${e.src_ZPCc}|>|$))`, e.tpl_email_fuzzy = `(^|${r}|"|\\(|${e.src_ZCc})(${e.src_email_name}@${e.tpl_host_fuzzy_strict})`, e.tpl_link_fuzzy = `(^|(?![.:/\\-_@])(?:[$+<=>^\`|｜]|${e.src_ZPCc}))((?![$+<=>^\`|｜])${e.tpl_host_port_fuzzy_strict}${e.src_path})`, e.tpl_link_no_ip_fuzzy = `(^|(?![.:/\\-_@])(?:[$+<=>^\`|｜]|${e.src_ZPCc}))((?![$+<=>^\`|｜])${e.tpl_host_port_no_ip_fuzzy_strict}${e.src_path})`, e;
        }(t.__opts__), r = t.__tlds__.slice();
        function n(t) {
          return t.replace("%TLDS%", e.src_tlds);
        }
        t.onCompile(), t.__tlds_replaced__ || r.push("a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]"), r.push(e.src_xn), e.src_tlds = r.join("|"), e.email_fuzzy = RegExp(n(e.tpl_email_fuzzy), "i"), e.email_fuzzy_global = RegExp(n(e.tpl_email_fuzzy), "ig"), e.link_fuzzy = RegExp(n(e.tpl_link_fuzzy), "i"), e.link_fuzzy_global = RegExp(n(e.tpl_link_fuzzy), "ig"), e.link_no_ip_fuzzy = RegExp(n(e.tpl_link_no_ip_fuzzy), "i"), e.link_no_ip_fuzzy_global = RegExp(n(e.tpl_link_no_ip_fuzzy), "ig"), e.host_fuzzy_test = RegExp(n(e.tpl_host_fuzzy_test), "i");
        const s = [];
        function o(t, e) {
          throw new Error(`(LinkifyIt) Invalid schema "${t}": ${e}`);
        }
        t.__compiled__ = {}, Object.keys(t.__schemas__).forEach(function(e) {
          const r = t.__schemas__[e];
          if (r === null)
            return;
          const n = { validate: null, link: null };
          if (t.__compiled__[e] = n, Ce(r) === "[object Object]")
            return !function(t) {
              return Ce(t) === "[object RegExp]";
            }(r.validate) ? ye(r.validate) ? n.validate = r.validate : o(e, r) : n.validate = function(t) {
              return function(e, r) {
                const n = e.slice(r);
                return t.test(n) ? n.match(t)[0].length : 0;
              };
            }(r.validate), void (ye(r.normalize) ? n.normalize = r.normalize : r.normalize ? o(e, r) : n.normalize = function(t, e) {
              e.normalize(t);
            });
          !function(t) {
            return Ce(t) === "[object String]";
          }(r) ? o(e, r) : s.push(e);
        }), s.forEach(function(e) {
          t.__compiled__[t.__schemas__[e]] && (t.__compiled__[e].validate = t.__compiled__[t.__schemas__[e]].validate, t.__compiled__[e].normalize = t.__compiled__[t.__schemas__[e]].normalize);
        }), t.__compiled__[""] = { validate: null, normalize: function(t, e) {
          e.normalize(t);
        } };
        const i = Object.keys(t.__compiled__).filter(function(e) {
          return e.length > 0 && t.__compiled__[e];
        }).map(Ae).join("|");
        t.re.schema_test = RegExp(`(^|(?!_)(?:[><｜]|${e.src_ZPCc}))(${i})`, "i"), t.re.schema_search = RegExp(`(^|(?!_)(?:[><｜]|${e.src_ZPCc}))(${i})`, "ig"), t.re.schema_at_start = RegExp(`^${t.re.schema_search.source}`, "i"), t.re.pretest = RegExp(`(${t.re.schema_test.source})|(${t.re.host_fuzzy_test.source})|@`, "i");
      }
      function ve(t, e, r, n) {
        const s = t.slice(r, n);
        this.schema = e.toLowerCase(), this.index = r, this.lastIndex = n, this.raw = s, this.text = s, this.url = s;
      }
      function we(t, e) {
        if (!(this instanceof we))
          return new we(t, e);
        var r;
        e || (r = t, Object.keys(r || {}).reduce(function(t, e) {
          return t || Ee.hasOwnProperty(e);
        }, false) && (e = t, t = {})), this.__opts__ = De({}, Ee, e), this.__schemas__ = De({}, be, t), this.__compiled__ = {}, this.__tlds__ = Fe, this.__tlds_replaced__ = false, this.re = {}, xe(this);
      }
      we.prototype.add = function(t, e) {
        return this.__schemas__[t] = e, xe(this), this;
      }, we.prototype.set = function(t) {
        return this.__opts__ = De(this.__opts__, t), this;
      }, we.prototype.test = function(t) {
        if (!t.length)
          return false;
        let e, r;
        if (this.re.schema_test.test(t)) {
          for (r = this.re.schema_search, r.lastIndex = 0;(e = r.exec(t)) !== null; )
            if (this.testSchemaAt(t, e[2], r.lastIndex))
              return true;
        }
        return !!(this.__opts__.fuzzyLink && this.__compiled__["http:"] && t.search(this.re.host_fuzzy_test) >= 0 && t.match(this.__opts__.fuzzyIP ? this.re.link_fuzzy : this.re.link_no_ip_fuzzy) !== null) || !!(this.__opts__.fuzzyEmail && this.__compiled__["mailto:"] && t.indexOf("@") >= 0 && t.match(this.re.email_fuzzy) !== null);
      }, we.prototype.pretest = function(t) {
        return this.re.pretest.test(t);
      }, we.prototype.testSchemaAt = function(t, e, r) {
        return this.__compiled__[e.toLowerCase()] ? this.__compiled__[e.toLowerCase()].validate(t, r, this) : 0;
      }, we.prototype.match = function(t) {
        const e = [], r = [], n = [], s = [];
        let o, i, u;
        function c(t, e) {
          return t ? e ? t.index !== e.index ? t.index < e.index ? t : e : t.lastIndex >= e.lastIndex ? t : e : t : e;
        }
        if (!t.length)
          return null;
        if (this.re.schema_test.test(t))
          for (u = this.re.schema_search, u.lastIndex = 0;(o = u.exec(t)) !== null; )
            i = this.testSchemaAt(t, o[2], u.lastIndex), i && r.push({ schema: o[2], index: o.index + o[1].length, lastIndex: o.index + o[0].length + i });
        if (this.__opts__.fuzzyLink && this.__compiled__["http:"])
          for (u = this.__opts__.fuzzyIP ? this.re.link_fuzzy_global : this.re.link_no_ip_fuzzy_global, u.lastIndex = 0;(o = u.exec(t)) !== null; )
            n.push({ schema: "", index: o.index + o[1].length, lastIndex: o.index + o[0].length });
        if (this.__opts__.fuzzyEmail && this.__compiled__["mailto:"])
          for (u = this.re.email_fuzzy_global, u.lastIndex = 0;(o = u.exec(t)) !== null; )
            s.push({ schema: "mailto:", index: o.index + o[1].length, lastIndex: o.index + o[0].length });
        const a = [0, 0, 0];
        let l = 0;
        for (;; ) {
          const o = [r[a[0]], s[a[1]], n[a[2]]], i = c(c(o[0], o[1]), o[2]);
          if (!i)
            break;
          if (i === o[0] ? a[0]++ : i === o[1] ? a[1]++ : a[2]++, i.index < l)
            continue;
          const u = new ve(t, i.schema, i.index, i.lastIndex);
          this.__compiled__[u.schema].normalize(u, this), e.push(u), l = i.lastIndex;
        }
        return e.length ? e : null;
      }, we.prototype.matchAtStart = function(t) {
        if (!t.length)
          return null;
        const e = this.re.schema_at_start.exec(t);
        if (!e)
          return null;
        const r = this.testSchemaAt(t, e[2], e[0].length);
        if (!r)
          return null;
        const n = new ve(t, e[2], e.index + e[1].length, e.index + e[0].length + r);
        return this.__compiled__[n.schema].normalize(n, this), n;
      }, we.prototype.tlds = function(t, e) {
        return t = Array.isArray(t) ? t : [t], e ? (this.__tlds__ = this.__tlds__.concat(t).sort().filter(function(t, e, r) {
          return t !== r[e - 1];
        }).reverse(), xe(this), this) : (this.__tlds__ = t.slice(), this.__tlds_replaced__ = true, xe(this), this);
      }, we.prototype.normalize = function(t) {
        t.schema || (t.url = `http://${t.url}`), t.schema !== "mailto:" || /^mailto:/i.test(t.url) || (t.url = `mailto:${t.url}`);
      }, we.prototype.onCompile = function() {};
      var ze = 2147483647, Se = 36, qe = /^xn--/, Be = /[^\0-\x7F]/, Le = /[\x2E\u3002\uFF0E\uFF61]/g, Ie = { overflow: "Overflow: input needs wider integers to process", "not-basic": "Illegal input >= 0x80 (not a basic code point)", "invalid-input": "Invalid input" }, Me = Math.floor, Te = String.fromCharCode;
      function $e(t) {
        throw new RangeError(Ie[t]);
      }
      function Re(t, e) {
        const r = t.split("@");
        let n = "";
        r.length > 1 && (n = r[0] + "@", t = r[1]);
        const s = function(t, e) {
          const r = [];
          let n = t.length;
          for (;n--; )
            r[n] = e(t[n]);
          return r;
        }((t = t.replace(Le, ".")).split("."), e).join(".");
        return n + s;
      }
      function Ne(t) {
        const e = [];
        let r = 0;
        const n = t.length;
        for (;r < n; ) {
          const s = t.charCodeAt(r++);
          if (s >= 55296 && s <= 56319 && r < n) {
            const n = t.charCodeAt(r++);
            (64512 & n) == 56320 ? e.push(((1023 & s) << 10) + (1023 & n) + 65536) : (e.push(s), r--);
          } else
            e.push(s);
        }
        return e;
      }
      var Pe = function(t) {
        return t >= 48 && t < 58 ? t - 48 + 26 : t >= 65 && t < 91 ? t - 65 : t >= 97 && t < 123 ? t - 97 : Se;
      }, Oe = function(t, e) {
        return t + 22 + 75 * (t < 26) - ((e != 0) << 5);
      }, Ze = function(t, e, r) {
        let n = 0;
        for (t = r ? Me(t / 700) : t >> 1, t += Me(t / e);t > 455; n += Se)
          t = Me(t / 35);
        return Me(n + 36 * t / (t + 38));
      }, je = function(t) {
        const e = [], r = t.length;
        let n = 0, s = 128, o = 72, i = t.lastIndexOf("-");
        i < 0 && (i = 0);
        for (let u = 0;u < i; ++u)
          t.charCodeAt(u) >= 128 && $e("not-basic"), e.push(t.charCodeAt(u));
        for (let u = i > 0 ? i + 1 : 0;u < r; ) {
          const i = n;
          for (let e = 1, s = Se;; s += Se) {
            u >= r && $e("invalid-input");
            const i = Pe(t.charCodeAt(u++));
            i >= Se && $e("invalid-input"), i > Me((ze - n) / e) && $e("overflow"), n += i * e;
            const c = s <= o ? 1 : s >= o + 26 ? 26 : s - o;
            if (i < c)
              break;
            const a = Se - c;
            e > Me(ze / a) && $e("overflow"), e *= a;
          }
          const c = e.length + 1;
          o = Ze(n - i, c, i == 0), Me(n / c) > ze - s && $e("overflow"), s += Me(n / c), n %= c, e.splice(n++, 0, s);
        }
        return String.fromCodePoint(...e);
      }, Ue = function(t) {
        const e = [], r = (t = Ne(t)).length;
        let n = 128, s = 0, o = 72;
        for (const c of t)
          c < 128 && e.push(Te(c));
        const i = e.length;
        let u = i;
        for (i && e.push("-");u < r; ) {
          let r = ze;
          for (const e of t)
            e >= n && e < r && (r = e);
          const c = u + 1;
          r - n > Me((ze - s) / c) && $e("overflow"), s += (r - n) * c, n = r;
          for (const a of t)
            if (a < n && ++s > ze && $e("overflow"), a === n) {
              let t = s;
              for (let r = Se;; r += Se) {
                const n = r <= o ? 1 : r >= o + 26 ? 26 : r - o;
                if (t < n)
                  break;
                const s = t - n, i = Se - n;
                e.push(Te(Oe(n + s % i, 0))), t = Me(s / i);
              }
              e.push(Te(Oe(t, 0))), o = Ze(s, c, u === i), s = 0, ++u;
            }
          ++s, ++n;
        }
        return e.join("");
      }, He = function(t) {
        return Re(t, function(t) {
          return Be.test(t) ? "xn--" + Ue(t) : t;
        });
      }, Ve = function(t) {
        return Re(t, function(t) {
          return qe.test(t) ? je(t.slice(4).toLowerCase()) : t;
        });
      }, Ge = { default: { options: { html: false, xhtmlOut: false, breaks: false, langPrefix: "language-", linkify: false, typographer: false, quotes: "“”‘’", highlight: null, maxNesting: 100 }, components: { core: {}, block: {}, inline: {} } }, zero: { options: { html: false, xhtmlOut: false, breaks: false, langPrefix: "language-", linkify: false, typographer: false, quotes: "“”‘’", highlight: null, maxNesting: 20 }, components: { core: { rules: ["normalize", "block", "inline", "text_join"] }, block: { rules: ["paragraph"] }, inline: { rules: ["text"], rules2: ["balance_pairs", "fragments_join"] } } }, commonmark: { options: { html: true, xhtmlOut: true, breaks: false, langPrefix: "language-", linkify: false, typographer: false, quotes: "“”‘’", highlight: null, maxNesting: 20 }, components: { core: { rules: ["normalize", "block", "inline", "text_join"] }, block: { rules: ["blockquote", "code", "fence", "heading", "hr", "html_block", "lheading", "list", "reference", "paragraph"] }, inline: { rules: ["autolink", "backticks", "emphasis", "entity", "escape", "html_inline", "image", "link", "newline", "text"], rules2: ["balance_pairs", "emphasis", "fragments_join"] } } } }, We = /^(vbscript|javascript|file|data):/, Qe = /^data:image\/(gif|png|jpeg|webp);/;
      function Je(t) {
        const e = t.trim().toLowerCase();
        return !We.test(e) || Qe.test(e);
      }
      var Xe = ["http:", "https:", "mailto:"];
      function Ye(t) {
        const e = D(t, true);
        if (e.hostname && (!e.protocol || Xe.indexOf(e.protocol) >= 0))
          try {
            e.hostname = He(e.hostname);
          } catch (r) {}
        return o(i(e));
      }
      function Ke(t) {
        const e = D(t, true);
        if (e.hostname && (!e.protocol || Xe.indexOf(e.protocol) >= 0))
          try {
            e.hostname = Ve(e.hostname);
          } catch (r) {}
        return n(i(e), n.defaultChars + "%");
      }
      function tr(t, e) {
        if (!(this instanceof tr))
          return new tr(t, e);
        e || H(t) || (e = t || {}, t = "default"), this.inline = new ke, this.block = new re, this.core = new Vt, this.renderer = new Ft, this.linkify = new we, this.validateLink = Je, this.normalizeLink = Ye, this.normalizeLinkText = Ke, this.utils = U, this.helpers = W({}, Et), this.options = {}, this.configure(t), e && this.set(e);
      }
      return tr.prototype.set = function(t) {
        return W(this.options, t), this;
      }, tr.prototype.configure = function(t) {
        const e = this;
        if (H(t)) {
          const e = t;
          if (!(t = Ge[e]))
            throw new Error('Wrong `markdown-it` preset "' + e + '", check name');
        }
        if (!t)
          throw new Error("Wrong `markdown-it` preset, can't be empty");
        return t.options && e.set(t.options), t.components && Object.keys(t.components).forEach(function(r) {
          t.components[r].rules && e[r].ruler.enableOnly(t.components[r].rules), t.components[r].rules2 && e[r].ruler2.enableOnly(t.components[r].rules2);
        }), this;
      }, tr.prototype.enable = function(t, e) {
        let r = [];
        Array.isArray(t) || (t = [t]), ["core", "block", "inline"].forEach(function(e) {
          r = r.concat(this[e].ruler.enable(t, true));
        }, this), r = r.concat(this.inline.ruler2.enable(t, true));
        const n = t.filter(function(t) {
          return r.indexOf(t) < 0;
        });
        if (n.length && !e)
          throw new Error("MarkdownIt. Failed to enable unknown rule(s): " + n);
        return this;
      }, tr.prototype.disable = function(t, e) {
        let r = [];
        Array.isArray(t) || (t = [t]), ["core", "block", "inline"].forEach(function(e) {
          r = r.concat(this[e].ruler.disable(t, true));
        }, this), r = r.concat(this.inline.ruler2.disable(t, true));
        const n = t.filter(function(t) {
          return r.indexOf(t) < 0;
        });
        if (n.length && !e)
          throw new Error("MarkdownIt. Failed to disable unknown rule(s): " + n);
        return this;
      }, tr.prototype.use = function(t) {
        const e = [this].concat(Array.prototype.slice.call(arguments, 1));
        return t.apply(t, e), this;
      }, tr.prototype.parse = function(t, e) {
        if (typeof t != "string")
          throw new Error("Input data should be a String");
        const r = new this.core.State(t, this, e);
        return this.core.process(r), r.tokens;
      }, tr.prototype.render = function(t, e) {
        return e = e || {}, this.renderer.render(this.parse(t, e), this.options, e);
      }, tr.prototype.parseInline = function(t, e) {
        const r = new this.core.State(t, this, e);
        return r.inlineMode = true, this.core.process(r), r.tokens;
      }, tr.prototype.renderInline = function(t, e) {
        return e = e || {}, this.renderer.render(this.parseInline(t, e), this.options, e);
      }, tr;
    });
  });

  // src/userscript-main.js
  var exports_userscript_main = {};
  __export(exports_userscript_main, {
    CONFIG: () => CONFIG,
    runArchive: () => runArchive,
    setConfig: () => setConfig
  });

  // src/ingest-core.js
  class CoreHardError extends Error {
    constructor(message) {
      super(message);
      this.name = "CoreHardError";
    }
  }
  function extractAnswerBody(wireAnswerPart) {
    if (!Array.isArray(wireAnswerPart)) {
      throw new CoreHardError("answer turn[4][0] is not an array; the wire path is broken (§1.4)");
    }
    const body = wireAnswerPart[0];
    if (typeof body !== "string") {
      throw new CoreHardError("answer turn[4][0][0] is not a string; the wire path is broken (§1.4)");
    }
    return body;
  }
  var PAGE_REFERENCE = /(\d+(?:\s*,\s*\d+)*)\s*페이지/g;
  var LECTURE_PREFIX = /^[\s]*(\d+)\s*강/;
  function toNumbers(digits) {
    return digits.split(",").map((part) => part.trim()).filter((part) => part.length > 0).map((part) => Number.parseInt(part, 10));
  }
  function extractPageReference(questionText) {
    if (typeof questionText !== "string") {
      throw new CoreHardError("question text is not a string (§1.4)");
    }
    const pages = [];
    PAGE_REFERENCE.lastIndex = 0;
    let match;
    while ((match = PAGE_REFERENCE.exec(questionText)) !== null) {
      pages.push(...toNumbers(match[1]));
      if (match.index === PAGE_REFERENCE.lastIndex) {
        PAGE_REFERENCE.lastIndex += 1;
      }
    }
    const lectureMatch = LECTURE_PREFIX.exec(questionText);
    return {
      page: pages.length > 0 ? pages[pages.length - 1] : null,
      pages,
      matchCount: pages.length,
      lecture: lectureMatch ? Number.parseInt(lectureMatch[1], 10) : null,
      multiPage: pages.length > 1
    };
  }
  function detectOtherLecture(questionText, selectedLecture) {
    const { lecture } = extractPageReference(questionText);
    if (lecture === null)
      return null;
    if (selectedLecture === null || selectedLecture === undefined)
      return null;
    return lecture === selectedLecture ? null : lecture;
  }
  function runPageStateMachine(turns, { initialPage = null, pageChoices = {} } = {}) {
    assertTurnArray(turns);
    const groups = [];
    const questions = [];
    const byTurnId = new Map;
    if (initialPage !== null && (!Number.isInteger(initialPage) || initialPage < 1)) {
      throw new CoreHardError("initial page must be a positive integer");
    }
    let currentPage = initialPage;
    let currentGroup = null;
    let pending = null;
    const openGroup = (page) => {
      const group = {
        page,
        unclassified: page === null,
        items: []
      };
      groups.push(group);
      currentGroup = group;
      return group;
    };
    for (const turn of turns) {
      if (turn.kind === "question") {
        const reference = extractPageReference(turn.text);
        let page = reference.page;
        if (Object.hasOwn(pageChoices, turn.id)) {
          const distinct = [...new Set(reference.pages)];
          if (distinct.length < 2 || !distinct.includes(pageChoices[turn.id])) {
            throw new CoreHardError("page choice must be one of the distinct referenced pages");
          }
          page = pageChoices[turn.id];
        }
        if (page !== null) {
          openGroup(page);
          currentPage = page;
        } else if (currentGroup === null || currentPage === null) {
          if (currentGroup === null)
            openGroup(currentPage);
        }
        pending = {
          question: turn,
          page: currentPage,
          inherited: reference.page === null,
          reference,
          answer: null
        };
        questions.push(pending);
        byTurnId.set(turn.id, pending);
        currentGroup.items.push(pending);
      } else {
        if (pending) {
          pending.answer = turn;
          byTurnId.set(turn.id, pending);
        }
      }
    }
    return { groups, questions, byTurnId };
  }
  var GRADE_ERROR = "error";
  var GRADE_WARNING = "warning";
  var GRADE_INFO = "info";
  function entry(grade, category, message, details = {}) {
    return { grade, category, message, ...details };
  }
  function validateStructure(turns) {
    assertTurnArray(turns);
    const entries = [];
    const ids = new Map;
    for (const turn of turns) {
      if (ids.has(turn.id)) {
        entries.push(entry(GRADE_ERROR, "duplicate turn id", `turn ID appears more than once in the list: ${turn.id}`, { turnId: turn.id }));
      } else {
        ids.set(turn.id, turn);
      }
    }
    let expected = "question";
    for (let i = 0;i < turns.length; i += 1) {
      if (turns[i].kind !== expected) {
        entries.push(entry(GRADE_ERROR, "alternation", `turn ${i} has kind ${turns[i].kind} where ${expected} was required; ` + "question and answer turns must alternate", { index: i, turnId: turns[i].id }));
      }
      expected = turns[i].kind === "question" ? "answer" : "question";
    }
    for (let i = 0;i < turns.length; i += 1) {
      if (turns[i].kind === "question" && turns[i + 1]?.kind !== "answer") {
        entries.push(entry(GRADE_ERROR, "unpaired question", `question at turn ${i} is not followed by an answer; the pair count is broken`, { index: i, turnId: turns[i].id }));
      }
    }
    const textCounts = new Map;
    for (const turn of turns) {
      if (turn.kind !== "question")
        continue;
      textCounts.set(turn.text, (textCounts.get(turn.text) ?? 0) + 1);
    }
    const repeated = [...textCounts.entries()].filter(([, n]) => n > 1);
    if (repeated.length > 0) {
      entries.push(entry(GRADE_INFO, "duplicate preserved", `repeated question text kept as separate turns: ${repeated.length}`, { questions: repeated.map(([text, count]) => ({ text, count })) }));
    }
    return entries;
  }
  function validatePages(turns, options = {}) {
    assertTurnArray(turns);
    const { selectedLecture = null, exhausted = null, limit = null } = options;
    const entries = [];
    const emptyAnswers = [];
    const multiPage = [];
    const otherLecture = [];
    const unclassified = [];
    const pageSet = new Set;
    for (let i = 0;i < turns.length; i += 1) {
      const turn = turns[i];
      if (turn.kind === "question") {
        const reference = extractPageReference(turn.text);
        if (reference.multiPage) {
          multiPage.push({ text: turn.text, ts: turn.ts, pages: reference.pages });
        }
        const other = detectOtherLecture(turn.text, selectedLecture);
        if (other !== null) {
          otherLecture.push({ text: turn.text, ts: turn.ts, lecture: other });
        }
      } else if (turn.text === "") {
        const question = findPrecedingQuestion(turns, i);
        emptyAnswers.push({
          questionText: question ? question.text : null,
          answerTs: turn.ts,
          answerTurnId: turn.id
        });
      }
    }
    const state = runPageStateMachine(turns, { pageChoices: options.pageChoices });
    for (const question of state.questions) {
      if (question.page === null) {
        unclassified.push({ text: question.question.text, ts: question.question.ts });
      } else {
        pageSet.add(question.page);
      }
    }
    if (multiPage.length > 0) {
      entries.push(entry(GRADE_WARNING, "multi-page reference", `multiple page references in one question: ${multiPage.length}`, { questions: multiPage.map((q) => ({ text: q.text, pages: q.pages })) }));
    }
    if (otherLecture.length > 0) {
      entries.push(entry(GRADE_WARNING, "other-lecture", `questions naming another lecture: ${otherLecture.length}`, {
        lecture: otherLecture[0].lecture,
        questions: otherLecture.map((q) => ({ text: q.text, ts: q.ts, lecture: q.lecture }))
      }));
    }
    if (unclassified.length > 0) {
      entries.push(entry(GRADE_WARNING, "unclassified", `unclassified questions: ${unclassified.length}`, { questions: unclassified }));
    }
    if (emptyAnswers.length > 0) {
      entries.push(entry(GRADE_WARNING, "empty answer", `empty answers: ${emptyAnswers.length}; the answer heading is kept`, { answers: emptyAnswers }));
    }
    if (exhausted === false) {
      entries.push(entry(GRADE_WARNING, "pagination", "not the whole conversation: a pagination token is still present", { limit }));
    } else if (exhausted === true) {
      entries.push(entry(GRADE_INFO, "pagination", "whole conversation confirmed", {
        turnCount: turns.length,
        limit
      }));
    }
    return {
      entries,
      counts: {
        turns: turns.length,
        questions: turns.filter((t) => t.kind === "question").length,
        answers: turns.filter((t) => t.kind === "answer").length,
        emptyAnswers: emptyAnswers.length,
        pages: pageSet.size,
        unclassified: unclassified.length,
        multiPage: multiPage.length,
        otherLecture: otherLecture.length
      }
    };
  }
  function validate(turns, options = {}) {
    assertTurnArray(turns);
    const structural = validateStructure(turns);
    const { entries: pageEntries, counts } = validatePages(turns, options);
    const entries = [...structural, ...pageEntries];
    const errors = entries.filter((e) => e.grade === GRADE_ERROR);
    const warnings = entries.filter((e) => e.grade === GRADE_WARNING);
    const infos = entries.filter((e) => e.grade === GRADE_INFO);
    return {
      saveBlocked: errors.length > 0,
      errors,
      warnings,
      infos,
      entries,
      counts,
      groups: runPageStateMachine(turns, { pageChoices: options.pageChoices }).groups,
      pairs: runPageStateMachine(turns, { pageChoices: options.pageChoices }).questions
    };
  }
  function assertTurnArray(turns) {
    if (!Array.isArray(turns)) {
      throw new CoreHardError("turns is not an array (§1.2)");
    }
    for (const turn of turns) {
      if (turn === null || typeof turn !== "object") {
        throw new CoreHardError("a turn is not an object (§1.2)");
      }
      if (typeof turn.id !== "string" || turn.id.length === 0) {
        throw new CoreHardError("a turn has no string id (§1.2)");
      }
      if (!Number.isInteger(turn.ts)) {
        throw new CoreHardError(`turn ${turn.id} has no integer ts (§1.2)`);
      }
      if (turn.kind !== "question" && turn.kind !== "answer") {
        throw new CoreHardError(`turn ${turn.id} has kind ${turn.kind} (§1.2)`);
      }
      if (typeof turn.text !== "string") {
        throw new CoreHardError(`turn ${turn.id} has non-string text (§1.2)`);
      }
    }
  }
  function findPrecedingQuestion(turns, index) {
    for (let i = index - 1;i >= 0; i -= 1) {
      if (turns[i].kind === "question")
        return turns[i];
    }
    return null;
  }

  // src/adapter.js
  class AdapterHardError extends CoreHardError {
    constructor(message) {
      super(message);
      this.name = "AdapterHardError";
    }
  }
  var RPC_ID = "khqZz";
  var RPC_PATH = "/_/LabsTailwindUi/data/batchexecute";
  var RPC_ORIGIN = "https://notebook.google.com";
  var DEFAULT_LIMIT = 200;
  var WIRE_KIND = Object.freeze({ 1: "question", 2: "answer" });
  var NEWEST_FIRST_HEAD = "answer";
  var XSSI_PREFIX = ")]}'";
  var FRAME_COUNT_OFFSET = 2;
  function stripXssiPrefix(text) {
    if (typeof text !== "string") {
      throw new AdapterHardError(`batchexecute response body is not a string: ${typeof text}`);
    }
    if (!text.startsWith(XSSI_PREFIX)) {
      throw new AdapterHardError(`batchexecute response does not start with the ${XSSI_PREFIX} guard prefix`);
    }
    return text.slice(XSSI_PREFIX.length);
  }
  function parseBatchExecuteFrames(text) {
    const body = stripXssiPrefix(text);
    const bytes = new TextEncoder().encode(body);
    const decoder = new TextDecoder("utf-8");
    const frames = [];
    let offset = 0;
    while (offset < bytes.length) {
      if (bytes[offset] === 10) {
        offset += 1;
        continue;
      }
      const headerEnd = bytes.indexOf(10, offset);
      if (headerEnd === -1) {
        throw new AdapterHardError("batchexecute frame is missing its length line; the envelope changed");
      }
      const header = decoder.decode(bytes.subarray(offset, headerEnd)).trim();
      if (!/^\d+$/.test(header)) {
        throw new AdapterHardError(`batchexecute frame header is not a length: ${JSON.stringify(header)}`);
      }
      const start = headerEnd + 1;
      const end = bytes.indexOf(10, start);
      const stop = end === -1 ? bytes.length : end;
      const payloadBytes = bytes.subarray(start, stop);
      const payload = decoder.decode(payloadBytes);
      const declared = Number.parseInt(header, 10);
      const utf16Units = payload.length;
      if (declared < utf16Units || declared > utf16Units + FRAME_COUNT_OFFSET) {
        throw new AdapterHardError(`batchexecute frame declares ${declared} but the payload has ` + `${utf16Units} UTF-16 units; the framing changed`);
      }
      try {
        frames.push(JSON.parse(payload));
      } catch (error) {
        throw new AdapterHardError(`batchexecute frame is not valid JSON: ${error.message}`);
      }
      offset = end === -1 ? bytes.length : end + 1;
    }
    return frames;
  }
  function extractRpcPayload(text, rpcId = RPC_ID) {
    for (const frame of parseBatchExecuteFrames(text)) {
      if (!Array.isArray(frame))
        continue;
      for (const entry of frame) {
        if (!Array.isArray(entry) || entry.length < 3)
          continue;
        if (entry[0] !== "wrb.fr" || entry[1] !== rpcId)
          continue;
        if (typeof entry[2] !== "string") {
          throw new AdapterHardError(`wrb.fr frame for ${rpcId} does not carry a string payload`);
        }
        return entry[2];
      }
    }
    throw new AdapterHardError(`no wrb.fr frame for rpcid ${rpcId} in the response`);
  }
  function parseRpcPayload(payload) {
    let parsed = payload;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {
        throw new AdapterHardError(`rpc payload is not valid JSON: ${error.message}`);
      }
    }
    if (!Array.isArray(parsed)) {
      throw new AdapterHardError("rpc payload is not an array");
    }
    if (parsed.length === 0) {
      throw new AdapterHardError("rpc payload is empty");
    }
    const turns = parsed[0];
    if (!Array.isArray(turns)) {
      throw new AdapterHardError("rpc payload[0] is not a turn array");
    }
    if (parsed.length === 1)
      return { turns, nextToken: null };
    const nextToken = parsed[1];
    if (typeof nextToken !== "string" || nextToken.length === 0) {
      throw new AdapterHardError(`rpc payload[1] is a next-page token but is not a non-empty string: ${typeof nextToken}`);
    }
    return { turns, nextToken };
  }
  function normalizeTurn(wireTurn, index = 0) {
    if (!Array.isArray(wireTurn)) {
      throw new AdapterHardError(`wire turn ${index} is not an array`);
    }
    const id = wireTurn[0];
    if (typeof id !== "string" || id.length === 0) {
      throw new AdapterHardError(`wire turn ${index} has no string id at turn[0]: ${JSON.stringify(id)}`);
    }
    const timestamp = wireTurn[1];
    if (!Array.isArray(timestamp) || !Number.isInteger(timestamp[0])) {
      throw new AdapterHardError(`turn ${index} id ${id}: turn[1] is not [unix_seconds, nanoseconds]`);
    }
    const roleCode = wireTurn[2];
    const kind = WIRE_KIND[roleCode];
    if (kind === undefined) {
      throw new AdapterHardError(`turn ${index} id ${id}: turn[2] is ${JSON.stringify(roleCode)}, not 1 (question) or 2 (answer)`);
    }
    let text;
    if (kind === "question") {
      text = wireTurn[3];
      if (typeof text !== "string") {
        throw new AdapterHardError(`turn ${index} id ${id}: a question has a non-string turn[3]: ${typeof text}`);
      }
    } else {
      text = extractAnswerBody(wireTurn[4]?.[0]);
    }
    return { id, ts: timestamp[0], kind, text };
  }
  function normalizeTurns(wireTurns) {
    if (!Array.isArray(wireTurns)) {
      throw new AdapterHardError("wire turn array is not an array");
    }
    if (wireTurns.length === 0) {
      throw new AdapterHardError("wire turn array is empty");
    }
    const newestFirst = wireTurns.map((turn, index) => normalizeTurn(turn, index));
    const seen = new Set;
    for (const turn of newestFirst) {
      if (seen.has(turn.id)) {
        throw new AdapterHardError(`turn id ${turn.id} appears more than once in the list`);
      }
      seen.add(turn.id);
    }
    let expected = NEWEST_FIRST_HEAD;
    for (let i = 0;i < newestFirst.length; i += 1) {
      if (newestFirst[i].kind !== expected) {
        throw new AdapterHardError(`newest-first turn ${i} id ${newestFirst[i].id} is ${newestFirst[i].kind} ` + `where ${expected} was required; the wire array must alternate`);
      }
      expected = expected === "question" ? "answer" : "question";
    }
    if (newestFirst.length % 2 !== 0) {
      throw new AdapterHardError(`wire turn array has ${newestFirst.length} turns, an odd count that leaves a question with no answer`);
    }
    return newestFirst.reverse();
  }
  function buildFReq({ conversationId, limit = DEFAULT_LIMIT }) {
    if (typeof conversationId !== "string" || conversationId.length === 0) {
      throw new AdapterHardError("f.req needs a conversation id");
    }
    if (!Number.isInteger(limit) || limit < DEFAULT_LIMIT) {
      throw new AdapterHardError(`first limit must be ${DEFAULT_LIMIT} or more (contract 4); got ${limit}`);
    }
    const inner = JSON.stringify([[], null, null, conversationId, limit]);
    return JSON.stringify([[["khqZz", inner, null, "generic"]]]);
  }
  function buildRequestUrl({
    notebookId,
    sid,
    authuser = 1,
    hl = "en",
    rt = "c",
    rpcId = RPC_ID
  }) {
    if (typeof notebookId !== "string" || notebookId.length === 0) {
      throw new AdapterHardError("the request needs a notebook id for source-path");
    }
    if (typeof sid !== "string" || sid.length === 0) {
      throw new AdapterHardError("the request needs f.sid, extracted from the page DOM");
    }
    const query = new URLSearchParams({
      rpcids: rpcId,
      "source-path": `/notebook/${notebookId}`,
      "f.sid": sid,
      hl,
      rt,
      authuser: String(authuser)
    });
    return `${RPC_ORIGIN}${RPC_PATH}?${query.toString()}`;
  }
  function buildPageRequest(options) {
    const { limit = DEFAULT_LIMIT, conversationId, at } = options;
    if (typeof at !== "string" || at.length === 0) {
      throw new AdapterHardError("the request needs the at token from the page DOM");
    }
    const fReq = buildFReq({ conversationId, limit });
    return {
      url: buildRequestUrl(options),
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ "f.req": fReq, at }).toString()
    };
  }
  function formatPaginationLine({ turnCount, pageCount, limit, exhausted }) {
    if (!Number.isInteger(turnCount) || turnCount < 0) {
      throw new AdapterHardError(`turnCount must be a non-negative integer: ${turnCount}`);
    }
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      throw new AdapterHardError(`pageCount must be at least 1: ${pageCount}`);
    }
    const tail = exhausted ? "토큰 소진 확인됨" : "토큰 소진 확인 안 됨 — 전체 조회 아님";
    return `조회: ${turnCount} turn (${pageCount}페이지, limit=${limit}, ${tail})`;
  }

  // src/browser-tokens.js
  var KNOWN_AT_KEYS = ["SNlM0e"];
  var KNOWN_SID_KEYS = ["FdrFJe"];
  var UNUSABLE_VALUES = new Set(["", "null", "undefined", "true", "false", "{}", "[]"]);
  function extractWizField(html, key) {
    const patterns = [
      new RegExp('"' + key + '"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"'),
      new RegExp("'" + key + "'\\s*:\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'"),
      new RegExp("&quot;" + key + "&quot;\\s*:\\s*&quot;((?:(?!&quot;).)*)&quot;")
    ];
    for (let i = 0;i < patterns.length; i++) {
      const match = html.match(patterns[i]);
      if (!match)
        continue;
      if (i === 0)
        return decodeJsonString(match[1]);
      if (i === 1)
        return match[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      return decodeHtmlEntities(match[1]);
    }
    return null;
  }
  function decodeJsonString(raw) {
    try {
      return JSON.parse('"' + raw + '"');
    } catch {
      return null;
    }
  }
  function decodeHtmlEntities(raw) {
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
    return raw.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, entity) => {
      const lower = entity.toLowerCase();
      if (lower[0] === "#") {
        const code = lower[1] === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return named[lower] ?? whole;
    });
  }
  function listWizCandidates(html, { minLength = 8, maxLength = 128 } = {}) {
    const found = new Map;
    const pattern = /"([A-Za-z_$][\w$]{2,40})"\s*:\s*"([^"\\]{1,400})"/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const key = match[1];
      const value = decodeJsonString(match[2]);
      if (value === null)
        continue;
      if (UNUSABLE_VALUES.has(value))
        continue;
      if (value.length < minLength || value.length > maxLength)
        continue;
      if (/[\s<>{}\[\]]/.test(value))
        continue;
      if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value))
        continue;
      if (value.startsWith("/") && value.includes("/"))
        continue;
      if (!found.has(key))
        found.set(key, value);
    }
    return [...found].map(([key, value]) => ({ key, value }));
  }
  function readAuthTokens(html, { knownOnly = false } = {}) {
    const at = firstPresent(html, KNOWN_AT_KEYS);
    const sid = firstPresent(html, KNOWN_SID_KEYS);
    const result = {
      at: at.value,
      sid: sid.value,
      source: {
        at: at.source,
        sid: sid.source
      },
      candidates: []
    };
    if (knownOnly)
      return result;
    if (!at.value || !sid.value) {
      result.candidates = listWizCandidates(html);
    }
    return result;
  }
  function firstPresent(html, keys) {
    for (const key of keys) {
      const value = extractWizField(html, key);
      if (value)
        return { value, source: "known:" + key };
    }
    return { value: null, source: "missing" };
  }
  function readAuthUser(href) {
    try {
      return new URL(href).searchParams.get("authuser");
    } catch {
      return null;
    }
  }
  function redactSecrets(text, secrets = []) {
    let out = String(text);
    for (const secret of secrets) {
      if (!secret)
        continue;
      out = out.split(secret).join("[REDACTED]");
      out = out.split(encodeURIComponent(secret)).join("[REDACTED]");
    }
    return out.replace(/([?&](?:f\.sid|at)=)[^&\s]*/g, "$1[REDACTED]");
  }

  // src/userscript-entry.js
  var CONTENT_TYPE = "application/x-www-form-urlencoded;charset=UTF-8";
  var REQUEST_TIMEOUT_MS = 30000;
  function readPageAuth(html, href) {
    const tokens = readAuthTokens(html);
    const authuser = readAuthUser(href);
    return {
      at: tokens.at,
      sid: tokens.sid,
      candidates: tokens.candidates,
      authuser,
      secrets: [tokens.at, tokens.sid].filter(Boolean)
    };
  }
  function classifyStatus(status) {
    if (status === 401 || status === 403)
      return "AUTH_FAILURE";
    if (status === 400)
      return "REQUEST_FORMAT_ERROR";
    return "HTTP_FAILURE";
  }
  async function postOnce(fetchImpl, { request, rpcId = RPC_ID, signal }) {
    let response;
    try {
      response = await fetchImpl(request.url, {
        method: request.method,
        credentials: "include",
        headers: request.headers,
        body: request.body,
        signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      throw new AdapterHardError(`fetch failed: ${error?.message || error}`);
    }
    if (!response.ok) {
      throw new AdapterHardError(`${classifyStatus(response.status)}: batchexecute returned HTTP ${response.status}`);
    }
    const payload = extractRpcPayload(await response.text(), rpcId);
    return parseRpcPayload(payload);
  }
  async function collectConversation({
    html,
    href,
    notebookId,
    conversationId,
    rpcId = RPC_ID,
    limit = DEFAULT_LIMIT,
    fetchImpl,
    signal
  }) {
    const page = readPageAuth(html, href);
    if (!page.at || !page.sid) {
      const missing = [!page.at && "at", !page.sid && "f.sid"].filter(Boolean).join(" and ");
      throw new AdapterHardError(`TOKEN_EXTRACTION_FAILED: no ${missing} token found in the page` + (page.candidates.length ? `; discovery candidates were ${page.candidates.map((c) => c.key).join(", ")}` : ""));
    }
    const request = buildPageRequest({
      conversationId,
      notebookId,
      sid: page.sid,
      at: page.at,
      limit,
      authuser: page.authuser
    });
    const { turns: wireTurns, nextToken } = await postOnce(fetchImpl, { request, rpcId, signal });
    const turns = normalizeTurns(wireTurns);
    return {
      turns,
      exhausted: nextToken === null,
      nextPageTokenPresent: nextToken !== null,
      limit,
      paginationLine: formatPaginationLine({
        turnCount: turns.length,
        pageCount: 1,
        limit,
        exhausted: nextToken === null
      }),
      secrets: page.secrets
    };
  }
  function describeFailure(error, secrets = []) {
    const message = String(error?.message || error);
    const verdict = ["TOKEN_EXTRACTION_FAILED", "AUTH_FAILURE", "REQUEST_FORMAT_ERROR", "HTTP_FAILURE"].find((code) => message.includes(code)) ?? "FETCH_OR_PARSE_FAILED";
    return { verdict, detail: redactSecrets(message, secrets) };
  }

  // src/citation-cleanup.js
  var FENCE = /^([ \t]*)(`{3,}|~{3,})([^\n]*)$/;
  var PROTECTED = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)|(?<![\\$])(\${1,2})(?!\$)(?:(?!\n[ \t]*\n)[\s\S])*?(?<![\\$])\2(?!\$)/g;
  var MARKER = /[ \t]+\[([1-9]\d*(?:-[1-9]\d*)?(?:, +[1-9]\d*(?:-[1-9]\d*)?)*)\](?=[.,:;!?。]|[ \t]*(?:\n|$|\|))/g;
  var RANGE_LABEL = /(?:구간|범위|배열|좌표|벡터|인덱스|interval|range|array|indices?|vector|coordinates?|matrix)\s*[:=]?\s*$/i;
  function stripSourceMarkers(text) {
    const references = new Set([...text.matchAll(/^[ \t]*\[(\d+(?:-\d+)?)\]:/gm)].map((match) => match[1]));
    const lines = text.split(`
`);
    const output = [];
    let buffer = [];
    let fence = null;
    const flush = () => {
      if (buffer.length)
        output.push(cleanSegment(buffer.join(`
`), references));
      buffer = [];
    };
    for (const line of lines) {
      const match = FENCE.exec(line);
      if (fence) {
        output.push(line);
        if (match && match[2][0] === fence.char && match[2].length >= fence.width && !match[3].trim())
          fence = null;
      } else if (match) {
        flush();
        fence = { char: match[2][0], width: match[2].length };
        output.push(line);
      } else {
        buffer.push(line);
      }
    }
    flush();
    return output.join(`
`);
  }
  function cleanSegment(text, references) {
    const prose = (part, offset) => part.replace(MARKER, (whole, numbers, index) => {
      const prefix = text.slice(0, offset + index).split(`
`).at(-1);
      if (!/\p{L}/u.test(prefix) || prefix.trimEnd().endsWith("]") || RANGE_LABEL.test(prefix))
        return whole;
      if (numbers.split(/, +/).some((label) => {
        if (references.has(label))
          return true;
        if (!label.includes("-"))
          return false;
        const [start, end] = label.split("-").map(Number);
        return [...references].some((number) => /^\d+$/.test(number) && Number(number) >= start && Number(number) <= end);
      }))
        return whole;
      return "";
    });
    let output = "";
    let cursor = 0;
    for (const match of text.matchAll(PROTECTED)) {
      output += prose(text.slice(cursor, match.index), cursor);
      output += match[2] ? match[0].replace(/[ \t]*\\quad[ \t]+\[[1-9]\d*(?:, +[1-9]\d*)*\](?=[ \t]*\${1,2}$)/, "") : match[0];
      cursor = match.index + match[0].length;
    }
    return output + prose(text.slice(cursor), cursor);
  }

  // src/markdown-assembler.js
  var import_markdown_it = __toESM(require_markdown_it(), 1);
  var DEFAULT_UT_OFFSET_MINUTES = 9 * 60;
  function formatTimestamp(ts, options = {}) {
    if (!Number.isInteger(ts)) {
      throw new CoreHardError(`ts is not an integer unix second: ${ts} (§1.2)`);
    }
    const offsetMinutes = options.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
    if (!Number.isInteger(offsetMinutes)) {
      throw new CoreHardError(`offsetMinutes is not an integer: ${offsetMinutes}`);
    }
    const shifted = new Date((ts + offsetMinutes * 60) * 1000);
    return shifted.toISOString().slice(0, 19).replace("T", " ");
  }
  var markdownBlocks = new import_markdown_it.default("commonmark");
  var markdownInline = new import_markdown_it.default("commonmark");
  for (const name of ["backticks", "link", "image", "autolink", "html_inline"]) {
    const rule = markdownInline.inline.ruler.__rules__.find((entry) => entry.name === name).fn;
    markdownInline.inline.ruler.at(name, (state, silent) => {
      const start = state.pos;
      const count = state.tokens.length;
      const result = rule(state, silent);
      const capture = state.env.inlineSourceRanges;
      if (result && !silent && capture && state.src === capture.source && (name !== "backticks" || state.tokens.slice(count).some((token) => token.type === "code_inline"))) {
        capture.ranges.push([start, state.pos]);
      }
      return result;
    });
  }
  function diagnoseSentenceSourceMarkers(text) {
    const found = [];
    const references = new Set([...text.matchAll(/^[ \t]*\[(\d+)\]:/gm)].map((m) => m[1]));
    const referenceLines = text.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) ?? [];
    const literalLines = texLiteralLines(referenceLines);
    const referenceText = referenceLines.map((line, index) => literalLines.has(index) ? line.replace(/[^\r\n]/g, " ") : line).join("");
    const markdownEnv = {};
    markdownBlocks.parse(referenceText, markdownEnv);
    const realReferences = new Set(Object.keys(markdownEnv.references ?? {}));
    processMathBlocks(text, (part, base) => {
      const regions = mathRegions(part);
      const verbs = [...part.matchAll(/(?<!\\)\\verb\*?(?![A-Za-z])([^\r\n])[^\r\n]*?(?:\1|$)/gm)];
      const add = (offset) => {
        const line = (text.slice(0, base + offset).match(/\r\n|\r|\n/g) ?? []).length + 1;
        if (!found.some((item) => item.line === line && item.kind === "ambiguous-source-marker"))
          found.push({ line, kind: "ambiguous-source-marker" });
      };
      for (const match of part.matchAll(/\[([1-9]\d*)\]/g)) {
        const offset = match.index;
        const prefix = part.slice(0, offset).split(/\r\n|\r|\n/).at(-1);
        const suffix = part.slice(offset + match[0].length);
        const region = regions.find((r) => offset >= r.start && offset < r.end);
        if (realReferences.has(match[1]) || verbs.some((v) => offset >= v.index && offset < v.index + v[0].length))
          continue;
        if (region) {
          const before = part.slice(region.start, offset);
          const after = part.slice(offset + match[0].length, region.end);
          if (/\\text\{[ \t]*$/.test(before) && /^\}[ \t]*(?:\${1,2}|\\{1,2}[)\]])$/.test(after))
            add(offset);
          continue;
        }
        if (/(?:구간|범위|배열|좌표|벡터|인덱스|interval|range|array|indices?|vector|coordinates?|matrix)\s*[:=]?\s*$/i.test(prefix))
          continue;
        const afterMath = regions.some((r) => r.end === offset && !r.ambiguous && !r.unclosed);
        const compactIndex = /[\p{L}\p{N}_\])}]$/u.test(prefix);
        const beforeClose = !compactIndex && /\p{L}/u.test(prefix) && /^\)/.test(suffix);
        const beforeParticle = !compactIndex && /\p{L}/u.test(prefix) && /^(?:으로|로|은|는|이|가|을|를|의|에|와|과|에서|까지|부터)/u.test(suffix);
        if (afterMath || beforeClose || beforeParticle)
          add(offset);
      }
      return part.replace(/([.!?。])([ \t]+)\[([1-9]\d*)\]([ \t]+)(?=[A-Z가-힣])/gu, (whole, punctuation, before, number, after, offset) => {
        const absolute = base + offset;
        const lineStart = Math.max(text.lastIndexOf(`
`, absolute - 1), text.lastIndexOf("\r", absolute - 1)) + 1;
        const beforeParagraph = text.slice(0, absolute).split(/\r?\n[ \t]*\r?\n/).at(-1);
        const afterParagraph = text.slice(absolute).split(/\r?\n[ \t]*\r?\n/)[0];
        const paragraph = beforeParagraph + afterParagraph;
        if (references.has(number) || [...paragraph.matchAll(/\[\d+(?:[,-]\s*\d+)*\]/g)].length !== 1)
          return whole;
        if (!/\p{L}.{5,}/u.test(text.slice(lineStart, absolute)))
          return whole;
        if (regions.some((region) => region.start < offset + whole.length && region.end > offset) || verbs.some((v) => v.index < offset + whole.length && v.index + v[0].length > offset))
          return whole;
        add(offset);
        return whole;
      });
    }, true, markdownEnv.references ?? {});
    return found.sort((a, b) => a.line - b.line);
  }
  function convertLatexDelimiters(text) {
    return processMathBlocks(text, (part) => convertMath(part));
  }
  function convertAnswerLatexDelimiters(text) {
    return processMathBlocks(text, (part) => convertMath(part, true), true);
  }
  function texLiteralLines(lines) {
    const literalLines = new Set;
    let environment = null;
    for (let line = 0;line < lines.length; line += 1) {
      let cursor = 0;
      let owned = environment !== null;
      const startPattern = /(?<!\\)\\begin\s*\{(verbatim\*?|Verbatim\*?)\}/g;
      while (cursor < lines[line].length) {
        if (environment) {
          const end = `\\end{${environment}}`;
          let index = lines[line].indexOf(end, cursor);
          while (index > 0 && lines[line][index - 1] === "\\")
            index = lines[line].indexOf(end, index + end.length);
          if (index < 0)
            break;
          cursor = index + end.length;
          environment = null;
        } else {
          startPattern.lastIndex = cursor;
          const start = startPattern.exec(lines[line]);
          if (!start)
            break;
          owned = true;
          environment = start[1];
          cursor = startPattern.lastIndex;
        }
      }
      if (owned)
        literalLines.add(line);
    }
    return literalLines;
  }
  function processMathBlocks(text, processor, protectLiteral = false, referenceOverride = null) {
    if (typeof text !== "string") {
      throw new CoreHardError("text is not a string (§1.2)");
    }
    const lines = text.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) ?? [];
    const protectedLines = new Set;
    const inlineBlocks = new Map;
    if (protectLiteral)
      for (const line of texLiteralLines(lines))
        protectedLines.add(line);
    const env = {};
    for (const token of markdownBlocks.parse(text, env)) {
      if (!token.map)
        continue;
      if (token.type === "fence" || token.type === "code_block" || token.type === "html_block") {
        for (let line = token.map[0];line < token.map[1]; line += 1)
          protectedLines.add(line);
      } else if (token.type === "inline") {
        for (let line = token.map[0];line < token.map[1]; line += 1)
          inlineBlocks.set(line, token);
      }
    }
    if (referenceOverride !== null)
      env.references = referenceOverride;
    const output = [];
    let prose = [];
    let currentBlock = null;
    let sourceOffset = 0;
    let proseOffset = 0;
    const flush = () => {
      if (prose.length)
        output.push(convertSegment(prose, currentBlock, env, processor, proseOffset, protectLiteral));
      prose = [];
    };
    for (let line = 0;line < lines.length; line += 1) {
      const block = inlineBlocks.get(line);
      if (protectedLines.has(line) || block === undefined) {
        flush();
        currentBlock = null;
        output.push(lines[line]);
      } else {
        if (block !== currentBlock)
          flush();
        currentBlock = block;
        if (!prose.length)
          proseOffset = sourceOffset;
        prose.push(lines[line]);
      }
      sourceOffset += lines[line].length;
    }
    flush();
    return output.join("");
  }
  function convertSegment(lines, token, env, processor, baseOffset, protectLiteral) {
    const segment = lines.join("");
    const contentLines = token.content.split(`
`);
    const offsets = [];
    let base = 0;
    if (contentLines.length > lines.length)
      return segment;
    for (let i = 0;i < contentLines.length; i += 1) {
      const raw = lines[i].replace(/(?:\r\n|\r|\n)$/, "");
      const content = contentLines[i];
      const index = content ? raw.indexOf(content) : raw.length;
      if (index < 0 || content && index !== raw.lastIndexOf(content))
        return segment;
      for (let j = 0;j < content.length; j += 1)
        offsets.push(base + index + j);
      if (i + 1 < contentLines.length)
        offsets.push(base + raw.length);
      base += lines[i].length;
    }
    const capture = { source: token.content, ranges: [] };
    markdownInline.inline.parse(token.content, markdownInline, { ...env, inlineSourceRanges: capture }, []);
    const ranges = capture.ranges.map(([start, end]) => [offsets[start], offsets[end - 1] + 1]);
    const uriRanges = [];
    for (const match of segment.matchAll(/(?<![A-Za-z0-9+.-])(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|mailto:)[^\s<>]+/gi)) {
      uriRanges.push([match.index, match.index + match[0].length]);
    }
    const literalRanges = protectLiteral ? [...segment.matchAll(/(?<!\\)\\verb\*?(?![A-Za-z])([^\r\n])[^\r\n]*?(?:\1|$)/gm)].map((match) => [match.index, match.index + match[0].length]) : [];
    let masked = segment;
    for (const [start, end] of [...ranges, ...uriRanges, ...literalRanges])
      masked = masked.slice(0, start) + " ".repeat(end - start) + masked.slice(end);
    for (const region of mathRegions(masked)) {
      if (region.hasComment || literalRanges.some(([start, end]) => start < region.end && end > region.start))
        ranges.push([region.start, region.end]);
    }
    ranges.push(...uriRanges, ...literalRanges);
    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    let converted = "";
    let cursor = 0;
    for (const [start, end] of ranges) {
      if (start < cursor) {
        if (end > cursor)
          converted += segment.slice(cursor, end);
        cursor = Math.max(cursor, end);
        continue;
      }
      converted += processor(segment.slice(cursor, start), baseOffset + cursor) + segment.slice(start, end);
      cursor = end;
    }
    return converted + processor(segment.slice(cursor), baseOffset + cursor);
  }
  function mathRegions(text) {
    const token = /(?<!\\)(\\+)([\[\]()])|(?<!\\)(\$+)/g;
    const regions = [];
    let stack = [];
    let start = 0;
    let ambiguous = false;
    let hasVerb = false;
    let hasComment = false;
    let match;
    while (match = token.exec(text)) {
      if (stack.length) {
        let skippedComment = false;
        for (let i = stack.at(-1).after;i < match.index; i += 1) {
          if (text[i] === "\\") {
            const verb = /^\\verb\*?(?![A-Za-z])/.exec(text.slice(i));
            if (verb) {
              const pos = i + verb[0].length;
              const delimiter = text[pos];
              const end = delimiter && !/[\r\n]/.test(delimiter) ? text.indexOf(delimiter, pos + 1) : -1;
              const lineEnd = text.slice(pos + 1).search(/[\r\n]/);
              if (end >= 0 && (lineEnd < 0 || end < pos + 1 + lineEnd)) {
                i = end;
                continue;
              }
            }
            i += 1;
          } else if (text[i] === "%") {
            hasComment = true;
            const offset = text.slice(i).search(/[\r\n]/);
            const next = offset < 0 ? text.length : i + offset + 1;
            token.lastIndex = next;
            stack.at(-1).after = next;
            skippedComment = true;
            break;
          }
        }
        if (skippedComment)
          continue;
        const prefix = text.slice(stack.at(-1).after, match.index + 1);
        const verbs = [...prefix.matchAll(/(?<!\\)\\verb\*?(?![A-Za-z])/g)];
        const verb = verbs.at(-1);
        if (verb) {
          hasVerb = true;
          const delimiterIndex = stack.at(-1).after + verb.index + verb[0].length;
          const delimiter = text[delimiterIndex];
          const begin = delimiterIndex + 1;
          const end = delimiter && delimiter !== `
` && delimiter !== "\r" ? text.indexOf(delimiter, begin) : -1;
          const newline = text.slice(begin).search(/[\r\n]/);
          if (end >= 0 && (newline < 0 || end < begin + newline) && match.index <= end) {
            token.lastIndex = end + 1;
            stack.at(-1).after = end + 1;
            continue;
          }
        }
      }
      const slash = match[1];
      const glyph = match[2];
      const dollar = match[3];
      const isOpen = slash && (glyph === "(" || glyph === "[");
      const type = dollar || slash + (glyph === "(" || glyph === ")" ? "()" : "[]");
      if (!stack.length) {
        if (slash && !isOpen) {
          regions.push({ start: match.index, end: token.lastIndex, ambiguous: true, orphan: true });
          continue;
        }
        start = match.index;
        ambiguous = false;
        hasVerb = false;
        hasComment = false;
        stack.push({ type, after: token.lastIndex });
        continue;
      }
      const top = stack.at(-1);
      let braceDepth = 0;
      const ownedPrefix = text.slice(start, match.index);
      for (let i = 0;i < ownedPrefix.length; i += 1) {
        if (ownedPrefix[i] === "\\") {
          i += 1;
          continue;
        }
        if (ownedPrefix[i] === "{")
          braceDepth += 1;
        else if (ownedPrefix[i] === "}")
          braceDepth = Math.max(0, braceDepth - 1);
      }
      if (braceDepth > 0 && slash === "\\\\" && (glyph === "]" || glyph === ")")) {
        top.after = token.lastIndex;
        continue;
      }
      const environment = [...text.slice(start, match.index).matchAll(/(?<!\\)\\begin\s*\{([^{}]+)\}/g)].at(-1);
      if (environment && slash === "\\\\" && (glyph === "]" || glyph === ")") && !text.slice(environment.index, match.index).includes(`\\end{${environment[1]}}`) && text.slice(token.lastIndex).includes(`\\end{${environment[1]}}`)) {
        top.after = token.lastIndex;
        continue;
      }
      const mismatchedCloser = slash && !isOpen && top.type !== type || dollar && top.type !== type && top.type !== "$" && top.type !== "$$";
      const remaining = text.slice(token.lastIndex).split(/\r?\n[ \t]*\r?\n|\r[ \t]*\r/)[0];
      const displayOwnerCloses = top.type === "$$" && /(?<![\\$])\$\$(?!\$)/.test(remaining) || /^\\{1,2}\[\]$/.test(top.type) && new RegExp(`(?<!\\\\)${"\\\\".repeat(top.type.length - 2)}\\]`).test(remaining);
      const sameLine = remaining.split(/[\r\n]/, 1)[0];
      const sameLineOwnerCloses = top.type === "$" ? /(?<![\\$])\$(?!\$)/.test(sameLine) : /^\\{1,2}\(\)$/.test(top.type) && new RegExp(`(?<!\\\\)${"\\\\".repeat(top.type.length - 2)}\\)`).test(sameLine);
      if (stack.length === 1 && mismatchedCloser && !displayOwnerCloses && !sameLineOwnerCloses && !/[\r\n]/.test(text.slice(start, match.index))) {
        regions.push({ start, end: token.lastIndex, ambiguous: true });
        stack = [];
        continue;
      }
      if (dollar && top.type === type || slash && !isOpen && top.type === type) {
        stack.pop();
        if (!stack.length) {
          regions.push({ start, end: token.lastIndex, ambiguous, hasVerb, hasComment, type });
        } else
          stack.at(-1).after = token.lastIndex;
      } else if (slash && !isOpen) {
        ambiguous = true;
        top.after = token.lastIndex;
      } else {
        ambiguous = true;
        stack.push({ type, after: token.lastIndex });
      }
    }
    if (stack.length)
      regions.push({
        start,
        end: text.length,
        ambiguous: true,
        unclosed: true,
        hasComment,
        explicit: stack.some((x) => x.type !== "$" && x.type !== "$$")
      });
    return regions;
  }
  function convertMath(text, repairMissingOpener = false) {
    const regions = mathRegions(text);
    const verbs = [...text.matchAll(/(?<!\\)\\verb\*?(?![A-Za-z])([^\r\n])[^\r\n]*?(?:\1|$)/gm)];
    const pattern = /\((\\\\)([+-]?(?:\d+(?:\.\d+)?|\.\d+))(\\text\{ [A-Za-zµΩ]{1,4}\})(\\\\\))(?=[^\r\n]*\p{L})/gu;
    if (repairMissingOpener)
      text = text.replace(pattern, (whole, slash, number, unit, closer, offset) => {
        if (verbs.some((v) => v.index < offset + whole.length && v.index + v[0].length > offset))
          return whole;
        const closeStart = offset + whole.length - closer.length;
        const owner = regions.find((region) => region.start <= closeStart && region.end > closeStart);
        if (!owner?.orphan || owner.start !== closeStart || regions.some((region) => region.start < closeStart && region.end > offset))
          return whole;
        if (!/\p{L}/u.test(text.slice(0, offset).split(/\r\n|\r|\n/).at(-1)))
          return whole;
        return `($${number}${unit}$)`;
      });
    let result = "";
    let cursor = 0;
    for (const region of mathRegions(text)) {
      result += text.slice(cursor, region.start);
      const original = text.slice(region.start, region.end);
      if (region.ambiguous || region.hasVerb || region.hasComment)
        result += original;
      else if (region.type === "$" || region.type === "$$")
        result += convertDollarMath(original, repairMissingOpener);
      else if (/^\\{1,2}(?:\(\)|\[\])$/.test(region.type)) {
        const width = region.type.length - 2;
        const marker = region.type.endsWith("[]") ? "$$" : "$";
        result += convertDollarMath(marker + original.slice(width + 1, -(width + 1)) + marker, repairMissingOpener);
      } else
        result += original;
      cursor = region.end;
    }
    return result + text.slice(cursor);
  }
  function convertDollarMath(text, repairSimpleText = false) {
    if (repairSimpleText)
      text = text.replace(/^\$\\\\text\{([^\\{}%#$&_\^~\r\n]+)\}\$$/, (_match, content) => `$\\text{${content}}$`);
    return text.replace(/(?<![\\$])(\${1,2})(?!\$)(?:(?!\n[ \t]*\n)[\s\S])*?(?<![\\$])\1(?!\$)/g, (math) => {
      let depth = 0;
      let balanced = true;
      for (let i = 0;i < math.length; i += 1) {
        if (math[i] === "\\") {
          i += 1;
          continue;
        }
        if (math[i] === "%")
          return math;
        if (math[i] === "{")
          depth += 1;
        else if (math[i] === "}")
          depth -= 1;
        if (depth < 0)
          balanced = false;
      }
      if (depth !== 0 || !balanced)
        return math;
      let result = math.replace(/(?<!\\)&(?:#(?:0*43|x0*2b|0*45|x0*2d)|lt|#0*60|#x0*3c|#0*126|#x0*7e);/gi, (entity, offset, source) => {
        let level = 0;
        for (let i = 0;i < offset; i += 1) {
          if (source[i] === "\\") {
            i += 1;
            continue;
          }
          if (source[i] === "{")
            level += 1;
          else if (source[i] === "}")
            level -= 1;
        }
        if (level !== 0 || /\b(?:https?:\/\/|mailto:)[^\s<>$]*$/i.test(source.slice(0, offset)))
          return entity;
        if (/^&#(?:0*126|x0*7e);$/i.test(entity))
          return '\\text{\\char"007E}';
        if (/^&#(?:0*43|x0*2b);$/i.test(entity))
          return "+";
        if (/^&#(?:0*45|x0*2d);$/i.test(entity))
          return "-";
        return "\\lt{}";
      });
      return result;
    });
  }
  function diagnoseMath(text) {
    const found = [];
    const add = (offset, kind) => {
      const line = (text.slice(0, offset).match(/\r\n|\r|\n/g) ?? []).length + 1;
      if (!found.some((item) => item.line === line && item.kind === kind))
        found.push({ line, kind });
    };
    processMathBlocks(text, (part, base) => {
      const scan = part.replace(/(?<!\\)\\verb\*?(?![A-Za-z])([^\r\n])[^\r\n]*?(?:\1|$)/gm, (m) => " ".repeat(m.length)).replace(/\b(?:https?:\/\/|mailto:)[^\s<>]*/gi, (m) => " ".repeat(m.length));
      const regions = mathRegions(part);
      for (const match of scan.matchAll(/(?<!\\)\\\\%(?![A-Za-z])/g)) {
        if (!regions.some((region) => match.index >= region.start && match.index < region.end))
          add(base + match.index, "escaped-percent");
      }
      for (const match of part.matchAll(/(?<!\\)\\\\\d[^\r\n]*?(?<!\\)\\\\\)/g))
        add(base + match.index, "missing-opener");
      for (const region of regions) {
        if (region.orphan) {
          const line = (text.slice(0, base + region.start).match(/\r\n|\r|\n/g) ?? []).length + 1;
          if (found.some((item) => item.line === line && item.kind === "missing-opener"))
            continue;
        }
        const value = part.slice(region.start, region.end);
        let comment = false;
        for (let i = 0;i < value.length; i += 1) {
          if (value[i] === "\\")
            i += 1;
          else if (value[i] === "%") {
            comment = true;
            break;
          }
        }
        if (comment || region.hasComment)
          continue;
        if (region.ambiguous) {
          if (!region.unclosed || region.explicit || /&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(value))
            add(base + region.start, "mixed-delimiter");
          continue;
        }
        if (region.type && (/^\$+$/.test(region.type) && region.type.length > 2 || /^\\{3,}/.test(region.type))) {
          add(base + region.start, "mixed-delimiter");
          continue;
        }
        if (region.hasVerb) {
          if (/&(?:#(?:0*43|x0*2b|0*45|x0*2d|0*60|x0*3c)|lt);/i.test(value))
            add(base + region.start, "verbatim");
          continue;
        }
        for (const match of value.matchAll(/&#(?:0*43|x0*2b|0*45|x0*2d);/gi))
          add(base + region.start + match.index, "encoded-operator");
        for (const match of value.matchAll(/&(?:lt|#0*60|#x0*3c);/gi))
          add(base + region.start + match.index, "less-than");
        for (const match of value.matchAll(/&(?:#0*126|#x0*7e|tilde);/gi))
          add(base + region.start + match.index, "tilde");
        if (!/\\begin\s*\{/.test(value)) {
          const candidate = scan.slice(region.start, region.end);
          let depth = 0;
          for (let i = 0;i < candidate.length; i += 1) {
            if (candidate[i] === "\\") {
              if (depth === 0 && candidate[i + 1] === "\\" && /[A-Za-z]/.test(candidate[i + 2] || ""))
                add(base + region.start + i, "doubled-command");
              i += 1;
            } else if (candidate[i] === "{")
              depth += 1;
            else if (candidate[i] === "}")
              depth = Math.max(0, depth - 1);
          }
        }
      }
      return part;
    });
    return found.sort((a, b) => a.line - b.line);
  }
  var CONTROL_CHAR = /[\u0000-\u001F\u007F]/;
  var PLAIN_UNSAFE = /^[-?:,[\]{}#&*!|>'"%@`]|^$|^\s|\s$|:\s|\s#|["']|^(true|false|yes|no|on|off|null|~)$/i;
  var NUMERIC_LIKE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
  function yamlScalar(value) {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new CoreHardError(`frontmatter value is not a finite number: ${value}`);
      }
      return String(value);
    }
    if (typeof value === "boolean")
      return value ? "true" : "false";
    if (typeof value !== "string") {
      throw new CoreHardError(`frontmatter value is not a scalar: ${value}`);
    }
    if (PLAIN_UNSAFE.test(value) || NUMERIC_LIKE.test(value) || CONTROL_CHAR.test(value)) {
      return quoteYamlString(value);
    }
    return value;
  }
  function quoteYamlString(value) {
    const escaped = value.replace(/[\\"\u0000-\u001F\u007F]/g, (character) => {
      switch (character) {
        case "\\":
          return "\\\\";
        case '"':
          return "\\\"";
        case `
`:
          return "\\n";
        case "\r":
          return "\\r";
        case "\t":
          return "\\t";
        case "\b":
          return "\\b";
        case "\f":
          return "\\f";
        case "\x00":
          return "\\0";
        default:
          return `\\x${character.charCodeAt(0).toString(16).padStart(2, "0")}`;
      }
    });
    return `"${escaped}"`;
  }
  function renderFrontmatter(meta) {
    const { course, lecture, conversationId, archivedDate, turns } = meta;
    if (typeof course !== "string" || course.length === 0) {
      throw new CoreHardError("frontmatter course is missing (contract 6.4, §9)");
    }
    if (!Number.isInteger(lecture)) {
      throw new CoreHardError("frontmatter lecture must be the number the user confirmed (contract 6.4, §9)");
    }
    if (typeof conversationId !== "string" || conversationId.length === 0) {
      throw new CoreHardError("frontmatter conversation id is missing (contract 6.1)");
    }
    if (typeof archivedDate !== "string" || archivedDate.length === 0) {
      throw new CoreHardError("frontmatter archive date is missing (contract 6.4)");
    }
    if (!Array.isArray(turns) || turns.length === 0) {
      throw new CoreHardError("a first archive has no turns (contract 6.4)");
    }
    const firstTurn = turns[0];
    const lastTurn = turns[turns.length - 1];
    if (typeof firstTurn?.id !== "string" || typeof lastTurn?.id !== "string") {
      throw new CoreHardError("a turn has no string id (contract 1.2)");
    }
    const lines = [
      "type: notebooklm-study",
      `course: ${yamlScalar(course)}`,
      `lecture: ${yamlScalar(lecture)}`,
      `archived: ${yamlScalar(archivedDate)}`,
      `archive_turns: ${yamlScalar(turns.length)}`,
      `archive_first_turn: ${quoteYamlString(firstTurn.id)}`,
      `archive_last_turn: ${quoteYamlString(lastTurn.id)}`,
      `archive_conversation: ${quoteYamlString(conversationId)}`
    ];
    return ["---", ...lines, "---"].join(`
`);
  }
  function renderEmptyAnswerPlaceholder(answerTs, options = {}) {
    return `> (이 답변 기록이 비어 있습니다 — ${formatTimestamp(answerTs, options)})`;
  }
  function renderPair(pair, options) {
    const { questionHeading, answerHeading, offsetMinutes = DEFAULT_UT_OFFSET_MINUTES } = options;
    const lines = [questionHeading, convertLatexDelimiters(pair.question.text)];
    if (pair.answer !== null && pair.answer !== undefined) {
      lines.push("", answerHeading);
      lines.push(pair.answer.text === "" ? renderEmptyAnswerPlaceholder(pair.answer.ts, { offsetMinutes }) : stripSourceMarkers(convertAnswerLatexDelimiters(pair.answer.text)));
    }
    return lines.join(`
`);
  }
  function joinBlocks(blocks) {
    return blocks.join(`

`);
  }
  function renderPageHeading(page, placement) {
    const marker = placement === "review" ? "####" : "##";
    if (page === null || page === undefined) {
      if (placement !== "review") {
        throw new CoreHardError("a first archive does not render a heading for an unclassified group (contract 2.6)");
      }
      return `${marker} 페이지 미지정`;
    }
    return `${marker} ${page}페이지`;
  }
  function assembleFirstArchive(turns, meta) {
    const offsetMinutes = meta.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
    const { groups } = runPageStateMachine(turns, { pageChoices: meta.pageChoices });
    const archivedDate = meta.archivedDate ?? meta.archived;
    const blocks = [
      renderFrontmatter({ ...meta, archivedDate, turns }),
      `# ${meta.lecture}강`
    ];
    for (const group of groups) {
      if (!(group.page === null && group.unclassified)) {
        blocks.push(renderPageHeading(group.page, "first"));
      }
      for (const pair of group.items) {
        blocks.push(renderPair(pair, { questionHeading: "### Q", answerHeading: "### A", offsetMinutes }));
      }
    }
    return `${joinBlocks(blocks)}
`;
  }
  function assembleReviewSession(turns, options) {
    const offsetMinutes = options.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
    const includeSection = options.includeSection ?? true;
    const includeDate = options.includeDate ?? true;
    const date = options.date;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new CoreHardError(`review session date must be YYYY-MM-DD: ${date} (spec 13.1)`);
    }
    const { groups } = runPageStateMachine(turns, { initialPage: options.initialPage ?? null, pageChoices: options.pageChoices });
    const blocks = [];
    if (includeSection)
      blocks.push("## 추가 질문");
    if (includeDate)
      blocks.push(`### ${date}`);
    for (const group of groups) {
      blocks.push(renderPageHeading(group.page, "review"));
      for (const pair of group.items) {
        blocks.push(renderPair(pair, { questionHeading: "##### Q", answerHeading: "##### A", offsetMinutes }));
      }
    }
    return `${joinBlocks(blocks)}
`;
  }

  // src/validation-output.js
  var BULLET = "•";
  var MARKER2 = Object.freeze({
    [GRADE_ERROR]: "✖",
    [GRADE_WARNING]: "⚠",
    [GRADE_INFO]: "·"
  });
  function firstLineOf(text) {
    if (typeof text !== "string")
      return "";
    for (const line of text.split(`
`)) {
      const trimmed = line.trim();
      if (trimmed.length > 0)
        return trimmed;
    }
    return "";
  }
  function bullet(marker, text, ts = null, options = {}) {
    const line = text.length > 0 ? text : "(빈 줄)";
    const prefix = marker.length > 0 ? `${marker} ${BULLET}` : BULLET;
    if (ts === null || ts === undefined) {
      return `${prefix} ${line}`;
    }
    return `${prefix} ${line} (${formatTimestamp(ts, options)})`;
  }
  function renderEntryBody(entry, options) {
    switch (entry.category) {
      case "unclassified":
        return (entry.questions ?? []).map((q) => bullet("", firstLineOf(q.text)));
      case "other-lecture":
        return (entry.questions ?? []).map((q) => bullet("", firstLineOf(q.text), q.ts, options));
      case "empty answer":
        return (entry.answers ?? []).map((a) => bullet("", firstLineOf(a.questionText), a.answerTs, options));
      case "multi-page reference":
        return (entry.questions ?? []).map((q) => bullet("", firstLineOf(q.text)));
      case "duplicate preserved":
        return (entry.questions ?? []).map((q) => bullet("", `${firstLineOf(q.text)} (${q.count}건)`, null, options));
      default:
        return [];
    }
  }
  function renderEntryHeader(entry) {
    switch (entry.category) {
      case "unclassified":
        return `⚠ 미분류 질문 ${countOf(entry.questions)}개`;
      case "other-lecture":
        return `⚠ 다른 강의 질문 ${countOf(entry.questions)}건 포함 (${lectureList(entry)})`;
      case "empty answer":
        return `⚠ 빈 답변 ${countOf(entry.answers)}건 (raw 응답에서 실제로 비어 있었음)`;
      case "multi-page reference":
        return `⚠ 복수 페이지 참조 ${countOf(entry.questions)}건`;
      case "duplicate preserved":
        return `· 중복 질문 ${countOf(entry.questions)}쌍 — 합치지 않고 모두 보존함`;
      default:
        return `${MARKER2[entry.grade] ?? MARKER2[GRADE_INFO]} ${entry.message}`;
    }
  }
  function countOf(list) {
    return Array.isArray(list) ? list.length : 0;
  }
  function lectureList(entry) {
    const numbers = [];
    for (const question of entry.questions ?? []) {
      if (Number.isInteger(question.lecture) && !numbers.includes(question.lecture)) {
        numbers.push(question.lecture);
      }
    }
    if (numbers.length === 0 && Number.isInteger(entry.lecture))
      numbers.push(entry.lecture);
    return numbers.map((n) => `${n}강`).join(", ");
  }
  function renderValidationBlock(result, options = {}) {
    if (!result || !Array.isArray(result.entries)) {
      throw new CoreHardError("renderValidationBlock needs the result of validate()");
    }
    const entries = [...result.entries, ...options.extraEntries ?? []];
    const counts = result.counts ?? {};
    const lines = ["저장 전 검증", ""];
    if (typeof options.course === "string" && options.course.length > 0) {
      lines.push(`과목: ${options.course}`);
    }
    if (Number.isInteger(options.lecture)) {
      lines.push(`강의: ${options.lecture}강`);
    }
    if (typeof options.filePath === "string" && options.filePath.length > 0) {
      lines.push(`파일: ${options.filePath}`);
    }
    if (options.pagination) {
      lines.push(formatPaginationLine(options.pagination));
    }
    lines.push(`질문: ${counts.questions ?? 0}`);
    lines.push(`답변: ${counts.answers ?? 0}`);
    lines.push(`빈 답변: ${counts.emptyAnswers ?? 0}`);
    lines.push(`감지된 페이지: ${counts.pages ?? 0}개`);
    lines.push(`미분류 질문: ${counts.unclassified ?? 0}개`);
    const { errors, warnings, infos } = partitionEntries(entries);
    if (errors.length > 0) {
      lines.push("");
      for (const entry of errors) {
        lines.push(`${MARKER2[GRADE_ERROR]} 오류 — ${entry.message}`);
        lines.push(...renderEntryBody(entry, options));
      }
    }
    if (warnings.length > 0) {
      lines.push("");
      for (const entry of warnings) {
        lines.push(renderEntryHeader(entry));
        lines.push(...renderEntryBody(entry, options));
      }
    }
    if (infos.length > 0) {
      lines.push("");
      for (const entry of infos) {
        lines.push(renderEntryHeader(entry));
        lines.push(...renderEntryBody(entry, options));
      }
    }
    lines.push("");
    lines.push(options.dryRun ? "검증만 실행: Obsidian에 파일을 저장하지 않습니다." : "실제 저장 모드");
    lines.push(`검증 결과: ${errors.length > 0 ? "차단" : warnings.length > 0 ? "주의" : "통과"} — error ${errors.length}건, warning ${warnings.length}건, info ${infos.length}건`);
    if (!options.dryRun)
      lines.push(renderSaveDecision(errors.length, warnings.length, infos.length));
    return lines.join(`
`);
  }
  function renderSaveDecision(errorCount, warningCount, infoCount) {
    const tally = `error ${errorCount}건, warning ${warningCount}건, info ${infoCount}건`;
    if (errorCount > 0) {
      return `저장: 차단 — ${tally}. error가 있어서 파일을 쓰지 않습니다`;
    }
    return `저장: 진행 — ${tally}. error만 저장을 막습니다`;
  }
  function partitionEntries(entries) {
    const errors = [];
    const warnings = [];
    const infos = [];
    for (const entry of entries) {
      if (entry.grade === GRADE_ERROR)
        errors.push(entry);
      else if (entry.grade === GRADE_WARNING)
        warnings.push(entry);
      else if (entry.grade === GRADE_INFO)
        infos.push(entry);
      else
        errors.push({ ...entry, grade: GRADE_ERROR, message: `알 수 없는 등급: ${entry.grade}` });
    }
    return { errors, warnings, infos };
  }
  function isSaveBlocked(result, extraEntries = []) {
    if (!result || typeof result !== "object") {
      throw new CoreHardError("isSaveBlocked needs a validation result");
    }
    if ((result.errors ?? []).some((entry) => entry.grade === GRADE_ERROR)) {
      return true;
    }
    return partitionEntries(extraEntries).errors.length > 0;
  }
  async function runValidationPipeline(request) {
    if (!request || typeof request !== "object") {
      throw new CoreHardError("runValidationPipeline needs a request object");
    }
    const { turns, write = null } = request;
    const result = validate(turns, {
      selectedLecture: request.selectedLecture,
      exhausted: request.exhausted,
      limit: request.limit,
      pageChoices: request.pageChoices
    });
    const block = renderValidationBlock(result, {
      course: request.course,
      lecture: request.lecture,
      filePath: request.filePath,
      pagination: request.pagination,
      offsetMinutes: request.offsetMinutes,
      extraEntries: request.extraEntries,
      dryRun: request.dryRun
    });
    if (isSaveBlocked(result, request.extraEntries)) {
      return {
        saveBlocked: true,
        block,
        result,
        writeAttempted: false,
        writeResult: null,
        reason: "grade error가 있어 저장을 시도하지 않았습니다"
      };
    }
    if (typeof write !== "function") {
      throw new CoreHardError("runValidationPipeline needs a write function when the validation passes");
    }
    const context = { result, block, turns, request };
    if (request.beforeWrite && !await request.beforeWrite(context)) {
      return {
        saveBlocked: false,
        block,
        result,
        writeAttempted: false,
        writeResult: null,
        reason: "사용자가 저장을 취소했습니다"
      };
    }
    const writeResult = await write(context);
    return {
      saveBlocked: false,
      block,
      result,
      writeAttempted: true,
      writeResult,
      reason: null
    };
  }

  // src/delta-rules.js
  var FENCE2 = /^---[ \t]*\r?\n/;
  function parseFrontmatter(content) {
    if (content === null || content === undefined) {
      return { present: false, fields: {}, order: [] };
    }
    if (typeof content !== "string") {
      throw new CoreHardError("existing file content is not a string (§1.4)");
    }
    if (!FENCE2.test(content)) {
      return { present: false, fields: {}, order: [] };
    }
    const rest = content.slice(FENCE2.exec(content)[0].length);
    const end = /^---[ \t]*(\r?\n|$)/m.exec(rest);
    if (!end) {
      throw new CoreHardError("frontmatter opens but never closes; the file is broken (§1.4)");
    }
    const body = rest.slice(0, end.index);
    const fields = {};
    const order = [];
    for (const line of body.split(`
`)) {
      if (line.trim() === "")
        continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)[ \t]*:[ \t]*(.*)$/.exec(line);
      if (!match) {
        throw new CoreHardError(`frontmatter line is not a scalar field: ${line}`);
      }
      fields[match[1]] = parseYamlScalar(match[2]);
      order.push(match[1]);
    }
    return { present: true, fields, order };
  }
  function parseYamlScalar(raw) {
    const trimmed = raw.replace(/\r$/, "");
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).replace(/\\([\\"nrtbf0]|x[0-9a-fA-F]{2})/g, (match, escape) => {
        switch (escape) {
          case "\\":
            return "\\";
          case '"':
            return '"';
          case "n":
            return `
`;
          case "r":
            return "\r";
          case "t":
            return "\t";
          case "b":
            return "\b";
          case "f":
            return "\f";
          case "0":
            return "\x00";
          default:
            return String.fromCharCode(Number.parseInt(escape.slice(1), 16));
        }
      });
    }
    return trimmed.trim();
  }
  var SECTION_HEADING = /^##[ \t]+추가[ \t]+질문[ \t]*\r?$/m;
  var SESSION_HEADING = /^###[ \t]+(\d{4}-\d{2}-\d{2})[ \t]*\r?$/gm;
  function hasAdditionalQuestionsSection(content) {
    if (typeof content !== "string")
      return false;
    return SECTION_HEADING.test(content);
  }
  function hasSessionDateHeading(content, date) {
    if (typeof content !== "string")
      return false;
    SESSION_HEADING.lastIndex = 0;
    let match;
    while ((match = SESSION_HEADING.exec(content)) !== null) {
      if (match[1] === date)
        return true;
    }
    return false;
  }
  var CONFLICT_OPTIONS = Object.freeze([
    { id: "append-review", label: "복습 추가 → '추가 질문' 영역에 넣기", isDefault: false },
    { id: "new-file", label: "새 파일로 저장", isDefault: false },
    { id: "overwrite", label: "덮어쓰기", isDefault: false },
    { id: "cancel", label: "취소", isDefault: true }
  ]);

  // src/save-mode.js
  var SAVE_MODES = ["first", "review"];
  var fail = (reason) => {
    throw new CoreHardError(reason);
  };
  var blocked = (reason) => ({ action: "blocked", write: false, reason, newTurns: [] });
  function readMetadata(content, request) {
    const { fields, order } = parseFrontmatter(content);
    for (const key of ["archive_conversation", "archive_last_turn", "archive_turns", "course", "lecture"]) {
      if (order.filter((k) => k === key).length !== 1 || !fields[key])
        fail(`missing or duplicate ${key}`);
    }
    if (fields.course !== request.course || fields.lecture !== String(request.lecture))
      fail("target metadata differs");
    if (order.filter((k) => k === "archive_review_sessions").length > 1)
      fail("duplicate review ledger");
    let sessions = [];
    if (fields.archive_review_sessions !== undefined) {
      try {
        sessions = JSON.parse(fields.archive_review_sessions);
      } catch {
        fail("broken review ledger");
      }
    }
    if (!Array.isArray(sessions))
      fail("review ledger must be a list");
    const seen = new Set;
    for (const session of sessions) {
      if (!session || typeof session.conversationId !== "string" || !session.conversationId || typeof session.lastTurnId !== "string" || !session.lastTurnId || !Number.isInteger(session.turnCount) || session.turnCount < 2 || seen.has(session.conversationId))
        fail("invalid review anchor");
      seen.add(session.conversationId);
    }
    return { fields, sessions };
  }
  function planModeSave(request) {
    const { mode, existingContent, turns, conversationId } = request;
    if (!SAVE_MODES.includes(mode))
      fail("choose first or review explicitly");
    if (typeof conversationId !== "string" || !conversationId)
      fail("conversation ID is required");
    if (!turns.length || validateStructure(turns).some((e) => e.grade === "error"))
      fail("invalid conversation structure");
    const base = { ...request, newTurns: [], write: false };
    if (mode === "first") {
      if (existingContent !== null && existingContent !== undefined)
        return { ...base, ...blocked("파일이 이미 있습니다. 처음 저장은 기존 파일을 덮어쓰지 않습니다. 복습 추가를 선택하세요.") };
      return { ...base, action: "first-archive", write: true };
    }
    if (existingContent === null || existingContent === undefined)
      return { ...base, ...blocked("복습을 추가할 기존 파일이 없습니다. 처음 저장을 선택하세요.") };
    const { fields, sessions } = readMetadata(existingContent, request);
    const saved = sessions.find((s) => s.conversationId === conversationId);
    const anchorId = saved?.lastTurnId ?? (fields.archive_conversation === conversationId ? fields.archive_last_turn : null);
    let position = -1;
    if (anchorId !== null) {
      position = turns.findIndex((t) => t.id === anchorId);
      if (position === -1)
        return { ...base, ...blocked("이미 저장한 대화의 마지막 메시지를 찾을 수 없습니다. 중복 방지를 위해 저장을 중단했습니다.") };
    }
    const newTurns = turns.slice(position + 1);
    if (!newTurns.length)
      return { ...base, action: "noop", sessions };
    if (validateStructure(newTurns).some((e) => e.grade === "error"))
      fail("anchor splits a question/answer pair");
    const initialPage = position >= 0 ? runPageStateMachine(turns.slice(0, position + 1), { pageChoices: request.pageChoices }).groups.at(-1)?.page ?? null : null;
    return {
      ...base,
      action: "append",
      write: true,
      newTurns,
      sessions,
      newConversation: anchorId === null,
      anchor: { turnId: anchorId, position: position + 1 },
      initialPage
    };
  }
  function renderModeSave(plan, options) {
    if (!plan.write)
      return null;
    if (plan.action === "first-archive")
      return assembleFirstArchive(plan.turns, {
        ...options,
        conversationId: plan.conversationId,
        archivedDate: options.date
      });
    const hasSection = hasAdditionalQuestionsSection(plan.existingContent);
    const fragment = assembleReviewSession(plan.newTurns, {
      ...options,
      initialPage: plan.initialPage,
      includeSection: !hasSection,
      includeDate: !hasSessionDateHeading(plan.existingContent, options.date)
    });
    const content = plan.existingContent + (hasSection ? `

` : `

---

`) + fragment;
    const sessions = plan.sessions.filter((s) => s.conversationId !== plan.conversationId);
    sessions.push({ conversationId: plan.conversationId, lastTurnId: plan.newTurns.at(-1).id, turnCount: plan.turns.length });
    const end = content.indexOf(`
---`, 4);
    let header = content.slice(0, end);
    const line = `archive_review_sessions: ${yamlScalar(JSON.stringify(sessions))}`;
    header = /^archive_review_sessions[ \t]*:/m.test(header) ? header.replace(/^archive_review_sessions[ \t]*:.*$/m, () => line) : header + `
` + line;
    return header + content.slice(end);
  }

  // src/vault-writer.js
  var VAULT_ORIGIN = "https://127.0.0.1:27125";
  var VAULT_SUCCESS_STATUS = 204;
  function buildVaultUrl(vaultPath, origin = VAULT_ORIGIN) {
    if (typeof vaultPath !== "string" || vaultPath.trim().length === 0) {
      throw new CoreHardError("the vault path is empty");
    }
    const trimmed = vaultPath.trim().replace(/^\/+/, "").replace(/^vault\//, "");
    if (trimmed.length === 0) {
      throw new CoreHardError("the vault path is empty after stripping the prefix");
    }
    const encoded = trimmed.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    return `${origin.replace(/\/+$/, "")}/vault/${encoded}`;
  }
  function buildVaultRequest({ path, content, apiKey, origin = VAULT_ORIGIN }) {
    if (typeof content !== "string") {
      throw new CoreHardError("the file content must be a string");
    }
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new CoreHardError("the vault write needs the plugin API key");
    }
    return {
      url: buildVaultUrl(path, origin),
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "text/markdown"
      },
      credentials: "omit"
    };
  }
  async function writeVaultFile(target) {
    const { fetchImpl } = target;
    if (typeof fetchImpl !== "function") {
      throw new CoreHardError("writeVaultFile needs an injected fetch implementation");
    }
    const request = buildVaultRequest(target);
    let response;
    try {
      response = await fetchImpl(request.url, {
        method: request.method,
        headers: request.headers,
        body: target.content,
        credentials: request.credentials
      });
    } catch (error) {
      return {
        ok: false,
        status: 0,
        url: request.url,
        reason: `the request did not complete: ${error.message}`
      };
    }
    if (response.status === VAULT_SUCCESS_STATUS) {
      return { ok: true, status: response.status, url: request.url, reason: null };
    }
    return {
      ok: false,
      status: response.status,
      url: request.url,
      reason: `status ${response.status} is not ${VAULT_SUCCESS_STATUS}; ` + "the vault did not accept the file"
    };
  }

  // src/archive-save.js
  async function readVaultFile({ path, apiKey, origin, fetchImpl }) {
    const url = buildVaultUrl(path, origin);
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "text/markdown" },
        credentials: "omit",
        cache: "no-store"
      });
      if (response.status === 404)
        return { ok: true, content: null, status: 404, url };
      if (response.status !== 200)
        return { ok: false, status: response.status, url, reason: `vault read status ${response.status}` };
      const content = await response.text();
      if (typeof content !== "string")
        throw new Error("non-text response");
      return { ok: true, content, status: 200, url };
    } catch {
      return { ok: false, status: 0, url, reason: `vault read did not complete — Obsidian 파일 조회 연결이 완료되지 않았습니다.
` + "Obsidian 실행, HTTPS 주소·포트와 인증서의 주소 일치, macOS CA 인증서 신뢰, " + "Userscripts의 NotebookLM 및 로컬 API 사이트 접근 허용을 확인하세요." };
    }
  }
  async function saveArchive(options) {
    const initial = await readVaultFile(options);
    if (!initial.ok)
      return initial;
    let plan;
    let content;
    try {
      plan = planModeSave({ ...options, existingContent: initial.content, targetPath: options.path });
      if (plan.action === "noop")
        return {
          ok: true,
          status: 0,
          url: initial.url,
          action: "noop",
          newTurnCount: 0,
          reason: "추가할 새 질문 없음; 기존 파일 유지"
        };
      if (!plan.write)
        return { ok: false, status: 0, url: initial.url, action: "blocked", reason: plan.reason };
      content = renderModeSave(plan, options);
    } catch {
      return {
        ok: false,
        status: 0,
        url: initial.url,
        action: "blocked",
        reason: "기존 노트의 메타데이터 또는 추가할 질문 구조를 확인할 수 없어 저장을 중단했습니다."
      };
    }
    const newTurnCount = plan.action === "append" ? plan.newTurns.length : options.turns.length;
    const message = plan.action === "append" ? `복습 추가: ${options.path}
${plan.newConversation ? "새 복습 대화 전체를 추가합니다." : "이미 저장한 대화의 신규 질문만 추가합니다."}
기존 본문 유지, 신규 ${newTurnCount} turn을 추가 질문에 저장합니다.
저장할까요?` : `${options.path}
새 파일에 ${newTurnCount} turn을 저장합니다.
저장할까요?`;
    if (!options.confirm(message))
      return {
        ok: false,
        status: 0,
        url: initial.url,
        action: "cancelled",
        reason: "save preview cancelled"
      };
    const latest = await readVaultFile(options);
    if (!latest.ok)
      return latest;
    if (latest.content !== initial.content)
      return {
        ok: false,
        status: 0,
        url: initial.url,
        action: "blocked",
        reason: "target changed during preview; rerun without overwriting edits"
      };
    const written = await writeVaultFile({ ...options, content });
    return { ...written, action: plan.action, newTurnCount, ...written.ok ? { mathDiagnostics: [...diagnoseMath(content), ...diagnoseSentenceSourceMarkers(content)].sort((a, b) => a.line - b.line) } : {} };
  }

  // src/conversation-selection.js
  function notebookIdFromUrl(href) {
    const url = new URL(href);
    const match = /^\/notebook\/([^/]+)\/?$/.exec(url.pathname);
    if (url.origin !== "https://notebook.google.com" || !match)
      throw new AdapterHardError("NotebookLM 노트북 화면에서 실행하세요.");
    return decodeURIComponent(match[1]);
  }
  async function findConversationCandidate({ html, href, notebookId, fetchImpl }) {
    const auth = readPageAuth(html, href);
    if (!auth.at || !auth.sid)
      throw new AdapterHardError("TOKEN_EXTRACTION_FAILED: page auth missing");
    const rpcId = "hPTbtc";
    const inner = JSON.stringify([[], null, notebookId, 1]);
    const body = new URLSearchParams({ "f.req": JSON.stringify([[[rpcId, inner, null, "generic"]]]), at: auth.at }).toString();
    let response;
    try {
      response = await fetchImpl(buildRequestUrl({ notebookId, sid: auth.sid, authuser: auth.authuser, rpcId }), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": CONTENT_TYPE },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch {
      throw new AdapterHardError("conversation candidate request did not complete");
    }
    if (!response.ok)
      throw new AdapterHardError(`${classifyStatus(response.status)}: conversation lookup failed`);
    let parsed;
    try {
      parsed = JSON.parse(extractRpcPayload(await response.text(), rpcId));
    } catch {
      throw new AdapterHardError("conversation candidate response changed");
    }
    const id = parsed?.[0]?.[0]?.[0];
    const row = parsed?.[0]?.[0];
    const timestamp = (value) => Array.isArray(value) && value.length === 2 && value.every(Number.isInteger);
    const knownRow = Array.isArray(row) && (row.length === 1 || row.length === 3 && timestamp(row[1]) && timestamp(row[2]));
    if (!Array.isArray(parsed) || parsed.length !== 1 || !Array.isArray(parsed[0]) || parsed[0].length !== 1 || !knownRow || typeof id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      throw new AdapterHardError("대화 후보를 확인하지 못했습니다. 질문이 있는 대화에서 다시 실행하세요.");
    }
    return id;
  }

  // src/archive-options.js
  function validCourseName(course) {
    return Boolean(course) && course !== "." && course !== ".." && !/[\\/\u0000-\u001f]/.test(course);
  }
  function courseFromNotebookTitle(title) {
    const match = String(title ?? "").match(/^\s*\[([^\[\]]+)\][^\[\]]*$/);
    const course = match?.[1].trim() ?? "";
    return validCourseName(course) ? course : "";
  }
  function validateSaveOptions(options) {
    const course = String(options.course ?? "").trim();
    const lecture = Number(options.lecture);
    if (!SAVE_MODES.includes(options.mode))
      throw new Error("처음 저장 또는 복습 추가를 선택하세요.");
    if (!validCourseName(course))
      throw new Error("과목명을 입력하세요. 경로 구분자나 줄바꿈은 넣을 수 없습니다.");
    if (!Number.isSafeInteger(lecture) || lecture < 1)
      throw new Error("강의 번호는 1 이상의 정수로 입력하세요.");
    return { mode: options.mode, course, lecture, dryRun: Boolean(options.dryRun) };
  }
  function requestSaveOptions(document2, defaults) {
    return new Promise((resolve) => {
      const dialog = document2.createElement("dialog");
      dialog.setAttribute("aria-label", "NotebookLM 아카이브");
      dialog.style.cssText = "max-width:420px;width:calc(100% - 48px);padding:24px;border:1px solid #bbb;border-radius:12px;background:#fff;color:#222;z-index:2147483647;font:15px system-ui;";
      dialog.innerHTML = `<form style="display:grid;gap:16px">
      <h2 style="font-size:20px;margin:0">NotebookLM 아카이브</h2>
      <p style="margin:0">현재 과목과 저장할 강의를 확인하세요.</p>
      <label>과목명 <input name="course" required placeholder="노트북 제목의 [과목명] 또는 직접 입력" style="display:block;width:95%;margin-top:6px;padding:8px"></label>
      <label>강의 번호 <input name="lecture" type="number" min="1" step="1" required placeholder="저장할 강의 번호를 직접 입력" style="display:block;width:95%;margin-top:6px;padding:8px"></label>
      <label><input name="dryRun" type="checkbox"> 검증만 실행 (Obsidian에 저장하지 않음)</label>
      <p role="alert" style="color:#b00020;margin:0"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="submit" value="first" style="padding:9px">처음 저장</button>
        <button type="submit" value="review" style="padding:9px">복습 추가</button>
        <button type="button" style="padding:9px">취소</button>
      </div>
      <p style="font-size:13px;margin:0">처음 저장은 새 강의 파일을 만듭니다. 복습 추가는 기존 강의 끝에 질문을 덧붙입니다.</p>
    </form>`;
      const form = dialog.querySelector("form");
      form.elements.course.value = courseFromNotebookTitle(document2.title);
      form.elements.lecture.value = "";
      form.elements.dryRun.checked = defaults.dryRun;
      const finish = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
          finish(validateSaveOptions({
            mode: event.submitter?.value,
            course: form.elements.course.value,
            lecture: form.elements.lecture.value,
            dryRun: form.elements.dryRun.checked
          }));
        } catch (error) {
          dialog.querySelector("[role=alert]").textContent = error.message;
        }
      });
      dialog.querySelector("[type=button]").addEventListener("click", () => finish(null));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(null);
      });
      document2.body.appendChild(dialog);
      dialog.showModal();
    });
  }
  function requestPageChoices(document2, questions) {
    if (!questions.length)
      return Promise.resolve({});
    return new Promise((resolve) => {
      const dialog = document2.createElement("dialog");
      dialog.setAttribute("aria-label", "대표 페이지 선택");
      dialog.style.cssText = "max-width:720px;width:calc(100% - 48px);max-height:85vh;overflow:auto;padding:24px;border:1px solid #bbb;border-radius:12px;background:#fff;color:#222;z-index:2147483647;font:15px system-ui;";
      const form = document2.createElement("form");
      const heading = document2.createElement("h2");
      heading.textContent = "복수 페이지 질문의 대표 페이지 선택";
      form.appendChild(heading);
      const help = document2.createElement("p");
      help.textContent = "각 질문을 묶을 페이지를 선택하세요. 첫 번째로 언급된 페이지가 기본 선택입니다.";
      form.appendChild(help);
      const selects = [];
      for (const question of questions) {
        const section = document2.createElement("section");
        const text = document2.createElement("pre");
        text.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;";
        text.textContent = `질문: ${question.text}`;
        section.appendChild(text);
        const details = document2.createElement("details");
        const summary = document2.createElement("summary");
        summary.textContent = "답변 보기";
        details.appendChild(summary);
        const answer = document2.createElement("pre");
        answer.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;";
        answer.textContent = question.answer ?? "(답변 없음)";
        details.appendChild(answer);
        section.appendChild(details);
        const label = document2.createElement("label");
        label.textContent = "대표 페이지: ";
        const select = document2.createElement("select");
        for (const page of question.pages) {
          const option = document2.createElement("option");
          option.value = String(page);
          option.textContent = `${page}페이지`;
          select.appendChild(option);
        }
        label.appendChild(select);
        section.appendChild(label);
        form.appendChild(section);
        selects.push(select);
      }
      const submit = document2.createElement("button");
      submit.type = "submit";
      submit.textContent = "선택 완료";
      form.appendChild(submit);
      const cancel = document2.createElement("button");
      cancel.type = "button";
      cancel.textContent = "취소";
      form.appendChild(cancel);
      const finish = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const choices = Object.create(null);
        questions.forEach((q, i) => {
          choices[q.id] = Number(selects[i].value);
        });
        finish(choices);
      });
      cancel.addEventListener("click", () => finish(null));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(null);
      });
      dialog.appendChild(form);
      document2.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  // src/userscript-main.js
  var CONFIG = {
    notebookId: "00000000-0000-4000-8000-000000000004",
    conversationId: "00000000-0000-4000-8000-000000000002",
    course: "",
    lecture: null,
    limit: 400,
    sourceLabel: "",
    vaultOrigin: VAULT_ORIGIN,
    dryRun: true
  };
  function setConfig(overrides = {}) {
    Object.assign(CONFIG, overrides);
    return CONFIG;
  }
  var REQUIRED = ["notebookId", "course"];
  function missingConfig(config) {
    const missing = REQUIRED.filter((key) => !config[key]);
    if (config.conversationId !== null && !config.conversationId)
      missing.push("conversationId");
    if (!Number.isInteger(config.lecture) || config.lecture < 1)
      missing.push("lecture");
    if (!Number.isInteger(config.limit) || config.limit < 200)
      missing.push("limit(>=200)");
    return missing;
  }
  function report(value) {
    const line = JSON.stringify(value);
    console.log("[nbm-archive] " + line);
    return line;
  }
  async function runArchive({
    html,
    href,
    fetchImpl = fetch,
    confirm = typeof window === "undefined" ? () => false : window.confirm.bind(window),
    promptForApiKey = typeof window === "undefined" ? () => null : window.prompt.bind(window),
    notify = typeof window === "undefined" ? () => {} : window.alert.bind(window),
    mode,
    resolvePages = typeof document === "undefined" ? async () => null : (questions) => requestPageChoices(document, questions),
    notebookId = CONFIG.notebookId,
    conversationId = CONFIG.conversationId,
    course = CONFIG.course,
    lecture = CONFIG.lecture,
    dryRun = CONFIG.dryRun,
    now = new Date
  }) {
    const cfg = { ...CONFIG, mode, notebookId, conversationId, course, lecture, dryRun };
    const missing = missingConfig(cfg);
    if (missing.length > 0) {
      return report({ step: "CONFIG", verdict: "CONFIG_INCOMPLETE", missing });
    }
    try {
      Object.assign(cfg, validateSaveOptions(cfg));
    } catch (error) {
      notify(error.message);
      return report({ step: "CONFIG", verdict: "CONFIG_INCOMPLETE" });
    }
    const candidate = cfg.conversationId === null;
    if (candidate) {
      try {
        cfg.conversationId = await findConversationCandidate({ html, href, notebookId: cfg.notebookId, fetchImpl });
      } catch (error) {
        notify("대화를 조회하지 못했습니다. 질문이 있는 NotebookLM 화면에서 다시 실행하세요.");
        return report({ step: "COLLECT", verdict: "CONVERSATION_LOOKUP_FAILED", detail: error.message });
      }
    }
    const collected = await collectConversation({
      html,
      href,
      notebookId: cfg.notebookId,
      conversationId: cfg.conversationId,
      limit: cfg.limit,
      fetchImpl
    }).catch((error) => {
      const out = describeFailure(error, []);
      report({ step: "COLLECT", ...out });
      return null;
    });
    if (collected === null)
      return null;
    report({
      step: "COLLECT",
      turnCount: collected.turns.length,
      exhausted: collected.exhausted,
      nextPageTokenPresent: collected.nextPageTokenPresent,
      pagination: collected.paginationLine
    });
    if (!collected.exhausted) {
      notify(`조회 한도 ${cfg.limit}개 안에 대화 전체를 가져오지 못했습니다.
일부 내용만 저장하지 않도록 저장을 중단했습니다.
Obsidian에는 저장하지 않았습니다. 긴 대화 처리는 별도 개선이 필요합니다.`);
      return report({
        step: "PARTIAL",
        verdict: "PAGINATION_UNPROVEN",
        turnCount: collected.turns.length,
        detail: "a next-page token came back and the page-2 request shape is unproven " + "(the one recorded attempt used token_param_index: 1 and repeated all " + "100 rows of page 1). Nothing was written."
      });
    }
    const ambiguous = collected.turns.flatMap((turn, index) => {
      if (turn.kind !== "question")
        return [];
      const pages = [...new Set(extractPageReference(turn.text).pages)];
      if (pages.length < 2)
        return [];
      const next = collected.turns[index + 1];
      return [{ id: turn.id, text: turn.text, answer: next?.kind === "answer" ? next.text : null, pages }];
    });
    let pageChoices = {};
    if (ambiguous.length) {
      pageChoices = await resolvePages(ambiguous);
      if (pageChoices === null)
        return report({ step: "CANCELLED", verdict: "CANCELLED", reason: "page selection cancelled" });
      if (!pageChoices || typeof pageChoices !== "object" || ambiguous.some((q) => !Object.hasOwn(pageChoices, q.id) || !q.pages.includes(pageChoices[q.id]))) {
        notify("대표 페이지 선택이 올바르지 않아 저장을 중단했습니다.");
        return report({ step: "BLOCKED", verdict: "INVALID_PAGE_SELECTION" });
      }
    }
    const vaultPath = `${cfg.course}/${cfg.lecture}강.md`;
    let approved = false;
    const pipeline = await runValidationPipeline({
      turns: collected.turns,
      pageChoices,
      dryRun: cfg.dryRun,
      course: cfg.course,
      lecture: cfg.lecture,
      selectedLecture: cfg.lecture,
      filePath: vaultPath,
      pagination: {
        turnCount: collected.turns.length,
        pageCount: 1,
        limit: cfg.limit,
        exhausted: collected.exhausted
      },
      exhausted: collected.exhausted,
      limit: cfg.limit,
      beforeWrite: ({ result, block }) => {
        report({
          step: "VALIDATION",
          saveBlocked: false,
          writeAttempted: false,
          errors: result.errors.length,
          warnings: result.warnings.length,
          infos: result.infos.length,
          counts: result.counts,
          reason: null
        });
        const questions = collected.turns.filter((turn) => turn.kind === "question");
        const preview = `저장 방식: ${cfg.mode === "first" ? "처음 저장" : "복습 추가"}
` + (candidate ? `최근 대화 후보를 조회했습니다. 지금 저장하려는 대화인지 아래 질문을 확인하세요.
` : "") + `시작 질문: ${questions[0]?.text.slice(0, 160) ?? "(없음)"}
` + `마지막 질문: ${questions.at(-1)?.text.slice(0, 160) ?? "(없음)"}

`;
        approved = confirm(preview + block);
        return approved;
      },
      write: async () => {
        if (cfg.dryRun) {
          return { ok: true, status: 0, url: null, reason: "dryRun: nothing was written" };
        }
        const apiKey = promptForApiKey("Obsidian Local REST API key");
        if (!apiKey) {
          return { ok: false, status: 0, url: null, reason: "no API key was given" };
        }
        return saveArchive({
          mode: cfg.mode,
          path: vaultPath,
          turns: collected.turns,
          pageChoices,
          course: cfg.course,
          lecture: cfg.lecture,
          conversationId: cfg.conversationId,
          date: formatTimestamp(Math.floor(now.getTime() / 1000)).slice(0, 10),
          apiKey,
          origin: cfg.vaultOrigin,
          fetchImpl,
          confirm
        });
      }
    });
    if (pipeline.saveBlocked) {
      report({
        step: "VALIDATION",
        saveBlocked: pipeline.saveBlocked,
        writeAttempted: pipeline.writeAttempted,
        errors: pipeline.result.errors.length,
        warnings: pipeline.result.warnings.length,
        infos: pipeline.result.infos.length,
        counts: pipeline.result.counts,
        reason: pipeline.reason
      });
      confirm(pipeline.block);
      return report({ step: "BLOCKED", writeResult: null });
    }
    if (!approved) {
      return report({ step: "CANCELLED", verdict: "CANCELLED", writeResult: pipeline.writeResult });
    }
    const action = pipeline.writeResult?.action;
    const step = action === "noop" ? "NOOP" : action === "cancelled" ? "CANCELLED" : pipeline.writeResult?.ok ? "DONE" : "BLOCKED";
    const diagnostics = pipeline.writeResult?.mathDiagnostics ?? [];
    const labels = { verbatim: "원문 수식의 인코딩 확인", "mixed-delimiter": "수식 구분자 후보 확인", "encoded-operator": "연산자 인코딩 확인", "less-than": "부등호 문맥 확인", tilde: "틸드 의미 확인", "doubled-command": "이중 백슬래시 후보 확인", "escaped-percent": "퍼센트 이스케이프 후보 확인", "missing-opener": "수식 시작 구분자 확인", "ambiguous-source-marker": "숫자 대괄호 후보 확인" };
    const diagnosticNotice = diagnostics.length ? `
표시 확인: 원문을 유지했습니다. Obsidian 소스 모드에서 다음 줄을 확인하세요.
` + diagnostics.slice(0, 20).map((item) => `${item.line}행: ${labels[item.kind]}`).join(`
`) + (diagnostics.length > 20 ? `
외 ${diagnostics.length - 20}건` : "") : "";
    if (step !== "CANCELLED")
      notify(step === "NOOP" ? "추가할 새 질문이 없습니다. 기존 파일을 유지했습니다." : step === "BLOCKED" ? `저장하지 않았습니다.
${pipeline.writeResult?.reason ?? "저장 조건을 확인하세요."}` : cfg.dryRun ? "검증을 완료했습니다. 검증만 실행하여 Obsidian에는 저장하지 않았습니다." : `${vaultPath}
${cfg.mode === "first" ? "처음 저장" : "복습 추가"}를 완료했습니다.${diagnosticNotice}`);
    return report({ step, writeResult: pipeline.writeResult });
  }
  function boot() {
    if (typeof document === "undefined")
      return;
    if (!document.body)
      return;
    if (location.pathname.indexOf("/notebook/") === -1)
      return;
    const onCsp = (event) => {
      if (String(event.blockedURI).includes("/_/LabsTailwindUi/data/batchexecute")) {
        report({
          step: "CSP",
          directive: event.effectiveDirective,
          disposition: event.disposition
        });
      }
    };
    document.addEventListener("securitypolicyviolation", onCsp);
    const button = document.createElement("button");
    button.textContent = "NotebookLM archive";
    button.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;" + "border-radius:8px;border:1px solid #888;background:#fff;color:#111;cursor:pointer;";
    const start = async () => {
      if (button.disabled)
        return;
      button.disabled = true;
      try {
        const options = await requestSaveOptions(document, CONFIG);
        if (options)
          await runArchive({
            ...options,
            html: document.documentElement.outerHTML,
            href: location.href,
            notebookId: notebookIdFromUrl(location.href),
            conversationId: null
          });
      } catch {
        window.alert("아카이브 실행을 완료하지 못했습니다. 다시 시도하세요.");
      } finally {
        button.disabled = false;
      }
    };
    button.addEventListener("click", start);
    document.body.appendChild(button);
    window.__nbmArchive = start;
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
