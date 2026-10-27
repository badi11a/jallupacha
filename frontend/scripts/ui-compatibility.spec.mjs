import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const fixture = readFileSync(new URL('../test/fixtures/ui-compatibility.html', import.meta.url), 'utf8');
const styles = ['tokens', 'base', 'page'].map(name => readFileSync(new URL(`../src/app/shared/ui/styles/${name}.css`, import.meta.url), 'utf8'));

function load(withKit) {
  const dom = new JSDOM(fixture.replace(/<link[^>]+data-kit>/g, ''));
  if (withKit) {
    // Mismo orden de cascada que la muestra: kit antes de los estilos anfitriones.
    const style = dom.window.document.createElement('style');
    style.textContent = styles.join('\n');
    dom.window.document.head.prepend(style);
  }
  return dom;
}

function snapshot(window, selector) {
  return [...window.document.querySelectorAll(selector)].map(element => {
    const style = window.getComputedStyle(element);
    return ['font-family', 'font-size', 'font-weight', 'color', 'background-color', 'margin', 'padding', 'display', 'box-sizing', 'min-height', 'min-width', 'width', 'border-radius', 'border-top-width', 'border-top-style', 'opacity', 'overflow-wrap', '--ui-color-primary', '--brand-ink'].map(property => [property, style.getPropertyValue(property)]);
  });
}

test('loading the kit preserves external controls, document styles and custom properties', () => {
  const before = load(false), after = load(true);
  assert.deepEqual(snapshot(after.window, 'html, body, body > h1, #outside, #outside *'), snapshot(before.window, 'html, body, body > h1, #outside, #outside *'));
  before.window.close(); after.window.close();
});

test('tokens and component rules activate locally and a second consumer can override its roles', () => {
  const dom = load(true), { document } = dom.window;
  const style = selector => dom.window.getComputedStyle(document.querySelector(selector));
  assert.equal(style('#default-kit').getPropertyValue('--brand-ink').trim(), '#22213F');
  assert.equal(style('#default-kit').getPropertyValue('--ui-radius-md').trim(), '7px');
  assert.equal(style('#themed-kit').getPropertyValue('--ui-radius-md').trim(), '4px');
  assert.equal(style('#outside').getPropertyValue('--brand-ink'), '');
  assert.equal(style('#default-kit .field').display, 'grid');
  assert.equal(style('#default-kit button:disabled').opacity, '0.58');
  assert.equal(style('#outside button').borderRadius, '0px');
  assert.equal(style('#default-kit').display, 'block');
  dom.window.close();
});

test('every selector is scoped, including responsive, reduced-motion and pseudo-element rules', () => {
  const dom = load(true);
  let checked = 0;
  function visit(rules) {
    for (const rule of rules) {
      if (rule.selectorText) {
        // CSSOM conserva listas y funciones; cada rama superior debe llevar el ámbito.
        let depth = 0, start = 0;
        for (let i = 0; i <= rule.selectorText.length; i++) {
          const char = rule.selectorText[i];
          if (char === '(') depth++;
          if (char === ')') depth--;
          if (i === rule.selectorText.length || (char === ',' && depth === 0)) {
            const selector = rule.selectorText.slice(start, i).trim();
            assert.match(selector, /^(?:\.ui-root\b|:where\(\.ui-root\)|body\.ui-page\b)/, selector);
            checked++; start = i + 1;
          }
        }
      }
      if (rule.cssRules) visit(rule.cssRules);
    }
  }
  visit(dom.window.document.styleSheets[0].cssRules);
  assert.ok(checked > 100);
  const pageBody = dom.window.document.body;
  pageBody.classList.add('ui-page');
  assert.equal(dom.window.getComputedStyle(pageBody).minWidth, '0px', 'The host must fit the space remaining beside a vertical scrollbar at 320 CSS px');
  dom.window.close();
});
