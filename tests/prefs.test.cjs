'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { pickTheme } = require('../src/prefs.js');

test('new visitors get the light book theme', () => {
  assert.equal(pickTheme(undefined), 'light');
  assert.equal(pickTheme({}), 'light');
});

test('a saved theme that the reader never chose falls back to light', () => {
  // Before the book skin, every saved record carried the old default "dark".
  assert.equal(pickTheme({ theme: 'dark' }), 'light');
  assert.equal(pickTheme({ theme: 'dark', themeChosen: false }), 'light');
});

test('a theme the reader chose with the toggle is kept', () => {
  assert.equal(pickTheme({ theme: 'dark', themeChosen: true }), 'dark');
  assert.equal(pickTheme({ theme: 'light', themeChosen: true }), 'light');
});

test('unknown theme values fall back to light', () => {
  assert.equal(pickTheme({ theme: 'neon', themeChosen: true }), 'light');
  assert.equal(pickTheme({ theme: 1, themeChosen: true }), 'light');
});
