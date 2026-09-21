import test from 'node:test';
import assert from 'node:assert/strict';
import {compressStorageText, decompressStorageText} from '../src/lib/taskStorageCompression';
test('compression round trips Unicode, empty and dictionary-reset-sized inputs',()=>{
  let seed=37;
  const large=Array.from({length:250000},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return String.fromCharCode(32+(seed>>>16)%90);}).join('');
  for(const text of ['', '中文 😀 \u0000 café'.repeat(2000),large]) assert.equal(decompressStorageText(compressStorageText(text)),text);
});
test('malformed compressed records fail closed',()=>{
  assert.throws(()=>decompressStorageText('!invalid'));
  assert.throws(()=>decompressStorageText(btoa('x')));
  assert.throws(()=>decompressStorageText(btoa('\xff\xff')));
});
