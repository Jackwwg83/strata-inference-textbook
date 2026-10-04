import copy
import unittest
from tiny_inference import TinyInference, encode, dot, MAX_CONTEXT

class TinyTests(unittest.TestCase):
    def setUp(self): self.m = TinyInference(7)
    def test_incremental_matches_full(self):
        ids=encode('hello world')
        full=self.m.prefill(ids)
        chunk=self.m.prefill(ids[:3]); self.m.prefill(ids[3:8],chunk); self.m.prefill(ids[8:],chunk)
        self.assertEqual(full,chunk)
    def test_snapshot_restore_continue(self):
        a=self.m.prefill(encode('hello'))
        b=self.m.restore(self.m.snapshot(a))
        self.m.prefill(encode(' world'),a); self.m.prefill(encode(' world'),b)
        self.assertEqual(a,b)
    def test_snapshot_deep_copy(self):
        a=self.m.prefill(encode('hi')); image=self.m.snapshot(a)
        a.recurrent[0][0][0]=1000
        self.assertNotEqual(image['state']['recurrent'][0][0][0],1000)
    def test_model_identity(self):
        other=TinyInference(8)
        with self.assertRaises(ValueError): other.restore(self.m.snapshot(self.m.prefill(encode('x'))))
    def test_invalid_snapshot_shape(self):
        p=self.m.snapshot(self.m.prefill(encode('x'))); p['state']['keys'][3]=[]
        with self.assertRaises(ValueError): self.m.restore(p)
    def test_finite_validation(self):
        p=self.m.snapshot(self.m.empty_state());p['state']['logits'][0]=float('nan')
        with self.assertRaises(ValueError): self.m.restore(p)
    def test_draft_all_accept_and_every_reject_position(self):
        prompt=encode('hello'); baseline,state=self.m.greedy(prompt,12)
        for corrupt in (None,0,1,2):
            generated,result,_=self.m.draft_demo(prompt,12,3,corrupt)
            self.assertEqual(generated,baseline);self.assertEqual(result,state)
    def test_empty_and_budget_rejection(self):
        with self.assertRaises(ValueError):self.m.greedy([],1)
        with self.assertRaises(ValueError):self.m.greedy([0]*MAX_CONTEXT,1)
    def test_interleaved_state_isolation(self):
        aa,bb=encode('hello'),encode('world')
        a,b=self.m.empty_state(),self.m.empty_state()
        for x,y in zip(aa,bb):self.m.step(x,a);self.m.step(y,b)
        self.assertEqual(a,self.m.prefill(aa));self.assertEqual(b,self.m.prefill(bb))
    def test_dimension_mismatch(self):
        with self.assertRaises(ValueError):dot([1,2],[1])
if __name__ == '__main__': unittest.main()
