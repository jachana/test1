// The maths is the point of this game, so these are golden numbers taken from
// Tibia itself — if one of them moves, the change was not intentional.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  expForLevel, levelForExp, expProgress, maxHealth, maxMana, maxCapacity, triesToAdvance, maxHit,
} from '../src/core/formulas.js';

test('experience curve matches Tibia', () => {
  assert.equal(expForLevel(1), 0);
  assert.equal(expForLevel(2), 100);
  assert.equal(expForLevel(8), 4200);
  assert.equal(expForLevel(50), 1847300);
});

test('levelForExp inverts the curve, with or without a hint', () => {
  for (const level of [1, 2, 8, 20, 57, 130]) {
    assert.equal(levelForExp(expForLevel(level)), level, `at level ${level}`);
    assert.equal(levelForExp(expForLevel(level) - 1), level - 1 || 1);
    // The hint is an optimisation, never an answer: a wrong one must not stick.
    assert.equal(levelForExp(expForLevel(level), 200), level, `hint too high at ${level}`);
    assert.equal(levelForExp(expForLevel(level), 1), level, `hint too low at ${level}`);
  }
});

test('every level 8 character is exactly 185 hp / 35 mana / 470 oz', () => {
  for (const voc of ['none', 'knight', 'paladin', 'sorcerer', 'druid']) {
    assert.equal(maxHealth(8, voc), 185, voc);
    assert.equal(maxMana(8, voc), 35, voc);
    assert.equal(maxCapacity(8, voc), 470, voc);
  }
  assert.equal(maxHealth(1, 'knight'), 150);
});

test('vocation gains start at level 9, not level 2', () => {
  assert.equal(maxHealth(9, 'knight'), 200);   // 185 + 15
  assert.equal(maxHealth(9, 'sorcerer'), 190); // 185 + 5
  assert.equal(maxMana(9, 'sorcerer'), 65);    // 35 + 30
  assert.equal(maxHealth(20, 'knight'), 365);
});

test('skill costs use the real per-vocation constants', () => {
  assert.equal(triesToAdvance('sword', 10, 'knight'), 50);
  assert.equal(triesToAdvance('sword', 11, 'knight'), 55);
  assert.equal(triesToAdvance('sword', 10, 'sorcerer'), 50);
  assert.equal(triesToAdvance('sword', 11, 'sorcerer'), 100);
  assert.equal(triesToAdvance('magic', 0, 'sorcerer'), 1600);
  assert.equal(triesToAdvance('shielding', 10, 'knight'), 100);
});

test('damage scales with weapon attack, skill and stance', () => {
  assert.equal(maxHit(10, 10, 1, 'balanced'), 17);
  assert.ok(maxHit(10, 10, 1, 'offensive') > maxHit(10, 10, 1, 'balanced'));
  assert.ok(maxHit(10, 10, 1, 'defensive') < maxHit(10, 10, 1, 'balanced'));
  // Skill matters as much as the weapon: a rapier at skill 60 beats an axe at 10.
  assert.ok(maxHit(10, 60, 50, 'balanced') > maxHit(40, 10, 50, 'balanced'));
});

test('expProgress reports the slice of the current level', () => {
  const p = expProgress(4200);
  assert.equal(p.level, 8);
  assert.equal(p.into, 0);
  assert.equal(p.need, expForLevel(9) - expForLevel(8));
});
