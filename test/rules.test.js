import test from "node:test";
import assert from "node:assert/strict";
import { hasLegalMove, inCheck, legalMove } from "../worker/rules.js";

const board = () => Array.from({ length: 10 }, () => Array(9).fill(null));

test("車不能穿過棋子", () => {
  const value = board();
  value[9][4] = { t: "K", c: "red" };
  value[0][4] = { t: "K", c: "black" };
  value[5][0] = { t: "R", c: "red" };
  value[4][0] = { t: "P", c: "red" };
  assert.equal(legalMove("red", { y: 5, x: 0 }, { y: 0, x: 0 }, value), false);
});

test("不能走出讓自己的將帥被攻擊的棋步", () => {
  const value = board();
  value[9][4] = { t: "K", c: "red" };
  value[0][3] = { t: "K", c: "black" };
  value[5][4] = { t: "R", c: "red" };
  value[1][4] = { t: "R", c: "black" };
  assert.equal(legalMove("red", { y: 5, x: 4 }, { y: 5, x: 5 }, value), false);
});

test("將帥照面會被判定為將軍", () => {
  const value = board();
  value[9][4] = { t: "K", c: "red" };
  value[0][4] = { t: "K", c: "black" };
  assert.equal(inCheck("red", value), true);
  assert.equal(inCheck("black", value), true);
});

test("無王的一方沒有合法棋步", () => {
  const value = board();
  value[9][4] = { t: "K", c: "red" };
  assert.equal(hasLegalMove("black", value), false);
});
