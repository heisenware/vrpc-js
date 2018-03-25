import unittest
from vrpc import VrpcLocal
import vrpc_test


class VrpcLocalTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls._vrpcLocal = VrpcLocal(vrpc_test)
        cls._testClass = cls._vrpcLocal.create('TestClass')
        cls._events = []

    def _onEvent(self, event, *args):
        if (event == 'new'):
            self._events.append(args[0])
        if (event == 'removed'):
            self._events.append(args[0])

    def test_a_create(self):
        self.assertTrue(hasattr(self._testClass.getRegistry, '__call__'))
        self.assertTrue(hasattr(self._testClass.hasCategory, '__call__'))
        self.assertTrue(hasattr(self._testClass.notifyOnNew, '__call__'))
        self.assertTrue(hasattr(self._testClass.notifyOnRemoved, '__call__'))
        self.assertTrue(hasattr(self._testClass.addEntry, '__call__'))
        self.assertTrue(hasattr(self._testClass.removeEntry, '__call__'))
        self.assertTrue(hasattr(self._testClass.callMeBack, '__call__'))
        self.assertFalse(hasattr(self._testClass, 'crazy'))

    def test_b_get_registry(self):
        self.assertEqual(self._testClass.getRegistry(), {})

    def test_c_has_category(self):
        self.assertFalse(self._testClass.hasCategory('test'))

    def test_d_notify(self):
        self._testClass.notifyOnNew((self._onEvent, 'new'))
        self._testClass.notifyOnRemoved((self._onEvent, 'removed'))

    def test_e_add_entry(self):
        entry = {
            'member1': 'first entry',
            'member2': 42,
            'member3': 3.14,
            'member4': [0, 1, 2, 3]
        }
        self._testClass.addEntry('test', entry)
        self.assertTrue(self._testClass.hasCategory('test'))
        self.assertEqual(self._events[0]['member1'], entry['member1'])
        ret = self._testClass.getRegistry()['test'][0]
        self.assertEqual(entry['member1'], ret['member1'])
        self.assertEqual(entry['member2'], ret['member2'])
        self.assertAlmostEqual(entry['member3'], ret['member3'], places=2)
        self.assertEqual(entry['member4'], ret['member4'])

    def test_f_remove_entry(self):
        entry = self._testClass.removeEntry('test')
        self.assertEqual(entry['member1'], 'first entry')
        self.assertFalse(self._testClass.hasCategory('test'))
        self.assertEqual(self._events[1]['member1'], 'first entry')
        try:
            self._testClass.removeEntry('test')
            self.assertTrue(False)
        except RuntimeError as err:
            self.assertEqual(str(err), 'Can not remove non-existing category')

    def test_g_call_me_back(self):
        was_called = False

        def callback(sleep_time):
            self.assertEqual(sleep_time, 100)
            nonlocal was_called
            was_called = True
        self._testClass.callMeBack(callback)
        self.assertTrue(was_called)
        # One more time...
        was_called = False
        self._testClass.callMeBack(callback)
        self.assertTrue(was_called)

    def test_h_call_static_function(self):
        self.assertEqual(
            self._vrpcLocal.call_static('TestClass', 'crazy'),
            'who is crazy?'
        )
        self.assertEqual(
            self._vrpcLocal.call_static('TestClass', 'crazy', 'vrpc'),
            'vrpc is crazy!'
        )


if __name__ == '__main__':
    unittest.main()
