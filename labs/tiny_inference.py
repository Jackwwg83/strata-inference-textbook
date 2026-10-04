#!/usr/bin/env python3
"""Executable *teaching* inference chain, Python standard library only.

NOT Strata-compatible, NOT trained, NOT a language-quality benchmark.
4 toy layers (3 recurrent + 1 causal attention), d=8, 4 experts/layer,
top-2 routing, simple residuals rather than Strata's gated residual streams.
The deliberately expensive draft demo teaches prefix verification, not speed.
"""
from __future__ import annotations
import argparse
import copy
from dataclasses import asdict, dataclass
import hashlib
import json
import math
from pathlib import Path
import random
from typing import Any

VOCAB = " abcdefghijklmnopqrstuvwxyz.,!?\n"
D, FF, LAYERS, EXPERTS, TOP_K, MAX_CONTEXT = 8, 6, 4, 4, 2, 512


def dot(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("dot: dimension mismatch")
    return sum(x * y for x, y in zip(a, b))


def mv(w: list[list[float]], x: list[float]) -> list[float]:
    return [dot(row, x) for row in w]


def norm(x: list[float], rms: bool = False) -> list[float]:
    denom = math.sqrt(sum(v * v for v in x) / (len(x) if rms else 1) + 1e-6)
    return [v / denom for v in x]


def softmax(x: list[float]) -> list[float]:
    m = max(x)
    e = [math.exp(v - m) for v in x]
    return [v / sum(e) for v in e]


def argmax(x: list[float]) -> int:
    # Stable tie rule: the first maximal index.
    return max(range(len(x)), key=lambda i: x[i])


def encode(text: str) -> list[int]:
    return [VOCAB.index(c) if c in VOCAB else VOCAB.index('?') for c in text.lower()]


def decode(ids: list[int]) -> str:
    return ''.join(VOCAB[i] for i in ids)


@dataclass
class State:
    tokens: list[int]
    recurrent: list[list[list[float]]]
    keys: list[list[list[float]]]
    values: list[list[list[float]]]
    logits: list[float]


class TinyInference:
    def __init__(self, seed: int = 7):
        rng = random.Random(seed)
        def matrix(rows: int, cols: int) -> list[list[float]]:
            scale = 0.7 / math.sqrt(cols)
            return [[rng.uniform(-scale, scale) for _ in range(cols)] for _ in range(rows)]
        self.embedding = matrix(len(VOCAB), D)
        self.head = matrix(len(VOCAB), D)
        self.layers: list[dict[str, Any]] = []
        for _ in range(LAYERS):
            self.layers.append({
                'q': matrix(D, D), 'k': matrix(D, D), 'v': matrix(D, D),
                'router': matrix(EXPERTS, D),
                'experts': [{'gate': matrix(FF, D), 'up': matrix(FF, D),
                             'down': matrix(D, FF)} for _ in range(EXPERTS)],
            })
        serialized = json.dumps([self.embedding, self.head, self.layers], separators=(',', ':'))
        self.model_id = hashlib.sha256(serialized.encode()).hexdigest()

    def empty_state(self) -> State:
        return State([], [[[0.0] * D for _ in range(D)] for _ in range(LAYERS)],
                     [[] for _ in range(LAYERS)], [[] for _ in range(LAYERS)], [0.0] * len(VOCAB))

    def step(self, token: int, state: State) -> list[float]:
        if type(token) is not int or not 0 <= token < len(VOCAB):
            raise ValueError('invalid token')
        if len(state.tokens) >= MAX_CONTEXT:
            raise ValueError('context exhausted; no silent truncation')
        x = self.embedding[token].copy()
        for li, layer in enumerate(self.layers):
            z = norm(x, rms=True)
            q = norm(mv(layer['q'], z))
            k = norm(mv(layer['k'], z))
            v = mv(layer['v'], z)
            if li % 4 == 3:
                # Only already processed positions are appended. No future mask leak.
                state.keys[li].append(k)
                state.values[li].append(v)
                scores = [dot(q, old_k) / math.sqrt(D) for old_k in state.keys[li]]
                p = softmax(scores)
                mixed = [sum(a * old_v[j] for a, old_v in zip(p, state.values[li])) for j in range(D)]
            else:
                # S[i][j], decay BEFORE the rank-one update.
                old = state.recurrent[li]
                decayed = [[0.9 * old[i][j] for j in range(D)] for i in range(D)]
                predicted = [sum(decayed[i][j] * k[i] for i in range(D)) for j in range(D)]
                delta = [0.4 * (v[j] - predicted[j]) for j in range(D)]
                new = [[decayed[i][j] + k[i] * delta[j] for j in range(D)] for i in range(D)]
                state.recurrent[li] = new
                mixed = [sum(new[i][j] * q[i] for i in range(D)) for j in range(D)]
            x = [a + 0.2 * b for a, b in zip(x, mixed)]
            z = norm(x, rms=True)
            routing = softmax(mv(layer['router'], z))
            ids = sorted(range(EXPERTS), key=lambda e: (-routing[e], e))[:TOP_K]
            selected_sum = sum(routing[e] for e in ids)
            combined = [0.0] * D
            for e in ids:
                expert = layer['experts'][e]
                gate, up = mv(expert['gate'], z), mv(expert['up'], z)
                act = [(g / (1.0 + math.exp(-g))) * u for g, u in zip(gate, up)]
                out = mv(expert['down'], act)
                # Apply this toy router weight ONCE, in the combine step.
                weight = routing[e] / selected_sum
                for j in range(D):
                    combined[j] += weight * out[j]
            x = [a + 0.1 * b for a, b in zip(x, combined)]
        state.tokens.append(token)
        state.logits = mv(self.head, norm(x, rms=True))
        if not all(math.isfinite(v) for v in state.logits):
            raise ArithmeticError('nonfinite logits')
        return state.logits.copy()

    def prefill(self, ids: list[int], state: State | None = None) -> State:
        result = self.empty_state() if state is None else state
        if len(result.tokens) + len(ids) > MAX_CONTEXT:
            raise ValueError('prompt exceeds context')
        for token in ids:
            self.step(token, result)
        return result

    def greedy(self, prompt: list[int], count: int) -> tuple[list[int], State]:
        if not prompt or count < 0 or len(prompt) + count > MAX_CONTEXT:
            raise ValueError('nonempty prompt and legal output budget required')
        state = self.prefill(prompt)
        out = []
        for _ in range(count):
            token = argmax(state.logits)
            out.append(token)
            self.step(token, state)
        return out, state

    def snapshot(self, state: State) -> dict[str, Any]:
        return {'schema': 1, 'model_id': self.model_id, 'state': copy.deepcopy(asdict(state))}

    def restore(self, payload: dict[str, Any]) -> State:
        # A format/model check, NOT a production security boundary or authenticated file format.
        if payload.get('schema') != 1 or payload.get('model_id') != self.model_id:
            raise ValueError('snapshot model/schema mismatch')
        s = copy.deepcopy(payload.get('state', {}))
        if set(s) != {'tokens', 'recurrent', 'keys', 'values', 'logits'}:
            raise ValueError('snapshot fields mismatch')
        tokens = s['tokens']
        if not isinstance(tokens, list) or len(tokens) > MAX_CONTEXT or any(type(t) is not int or not 0 <= t < len(VOCAB) for t in tokens):
            raise ValueError('invalid snapshot tokens')
        def vector(x: Any, n: int) -> bool:
            return isinstance(x, list) and len(x) == n and all(type(v) in (float, int) and math.isfinite(v) for v in x)
        if not vector(s['logits'], len(VOCAB)):
            raise ValueError('invalid logits')
        if not isinstance(s['recurrent'], list) or len(s['recurrent']) != LAYERS:
            raise ValueError('invalid recurrent layers')
        for matrix in s['recurrent']:
            if not isinstance(matrix, list) or len(matrix) != D or not all(vector(row, D) for row in matrix):
                raise ValueError('invalid recurrent shape')
        for name in ('keys', 'values'):
            if not isinstance(s[name], list) or len(s[name]) != LAYERS:
                raise ValueError('invalid KV layers')
            for li, rows in enumerate(s[name]):
                expected = len(tokens) if li % 4 == 3 else 0
                if not isinstance(rows, list) or len(rows) != expected or not all(vector(row, D) for row in rows):
                    raise ValueError('invalid KV shape')
        return State(**s)

    def draft_demo(self, prompt: list[int], count: int, window: int = 3,
                   corrupt_at: int | None = 1) -> tuple[list[int], State, list[dict[str, Any]]]:
        """Serial reference verification of a deliberately expensive oracle draft.
        Not an MTP implementation, not batched verification, no speed claim.
        A rejected token is replaced by the target choice; all later drafts are discarded.
        """
        if not prompt or count < 0 or len(prompt) + count > MAX_CONTEXT or not 1 <= window <= 5:
            raise ValueError('illegal draft budget')
        if corrupt_at is not None and not 0 <= corrupt_at < window:
            raise ValueError('invalid corruption index')
        state, output, log = self.prefill(prompt), [], []
        while len(output) < count:
            candidate_state = copy.deepcopy(state)
            drafts = []
            for i in range(min(window, count - len(output))):
                candidate = argmax(candidate_state.logits)
                if i == corrupt_at:
                    candidate = (candidate + 1) % len(VOCAB)
                drafts.append(candidate)
                self.step(candidate, candidate_state)
            verified = copy.deepcopy(state)
            accepted, emitted = 0, []
            for candidate in drafts:
                target = argmax(verified.logits)
                emitted.append(target)
                self.step(target, verified)
                if candidate != target:
                    break
                accepted += 1
            state = verified  # One explicit publication of the verified state.
            output.extend(emitted)
            log.append({'drafts': drafts, 'accepted_prefix': accepted, 'emitted': emitted})
        return output, state, log


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prompt', default='hello')
    parser.add_argument('--tokens', type=int, default=16)
    parser.add_argument('--seed', type=int, default=7)
    parser.add_argument('--snapshot', type=Path)
    args = parser.parse_args()
    model = TinyInference(args.seed)
    try:
        baseline, state = model.greedy(encode(args.prompt), args.tokens)
        spec, spec_state, rounds = model.draft_demo(encode(args.prompt), args.tokens)
    except ValueError as exc:
        parser.error(str(exc))
    assert baseline == spec and state == spec_state
    print('TEACHING ONLY: random weights, no language quality or speed claim.')
    print(json.dumps({'geometry': {'layers': LAYERS, 'd': D, 'experts': EXPERTS, 'top_k': TOP_K},
                      'model_id': model.model_id, 'prompt_ids': encode(args.prompt),
                      'generated_ids': baseline, 'text': decode(baseline),
                      'draft_matches_greedy': True, 'rounds': rounds}, ensure_ascii=False, indent=2))
    if args.snapshot:
        # Educational export: no claim of crash-safe production persistence.
        args.snapshot.write_text(json.dumps(model.snapshot(state), indent=2), encoding='utf8')
        print(f'Snapshot written: {args.snapshot}')

if __name__ == '__main__':
    main()
