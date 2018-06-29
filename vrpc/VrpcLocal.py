import json
import sys


class Proxy(object):

    def __init__(self, vrpc, caller):
        self._vrpc = vrpc
        self._caller = caller

    def _packData(self, function, *args):
        data = {}
        for index, arg in enumerate(args):
            # Argument is function
            if (hasattr(arg, '__call__')):
                id = self._caller.register_callback(function, index, arg)
                data["_{}".format(index + 1)] = id
            elif (self._isEmitter(arg)):
                id = self._caller.register_emitter(function, index, arg)
                data["_{}".format(index + 1)] = id
            else:
                data["_{}".format(index + 1)] = arg
        return data

    def _isEmitter(self, arg):
        pass
        return (
            type(arg) == tuple and
            len(arg) == 2 and
            hasattr(arg[0], '__call__') and
            type(arg[1] == str)
        )


class Caller(object):

    def __init__(self, vrpc):
        self._invoke_id = 0
        self._callbacks = {}
        self._emitters = {}
        self._vrpc = vrpc
        self._vrpc.onCallback(self._handle_callback)

    def _handle_callback(self, json_string):
        payload = json.loads(json_string)
        id = payload['id']
        if id in self._callbacks:
            args = tuple(v for _, v in sorted(payload['data'].items()))
            self._callbacks[id](*args)
            self._callbacks.pop(id, None)
        elif id in self._emitters:
            emitter = self._emitters[id]
            args = tuple(v for _, v in sorted(payload['data'].items()))
            emitter[0](emitter[1], *args)

    def register_callback(self, function, index, callback):
        id = "__f__{}-{}-{}".format(function, index, self._invoke_id)
        self._invoke_id = (self._invoke_id + 1) % sys.maxsize
        if id in self._callbacks:
            return -1
        self._callbacks[id] = callback
        return id

    def register_emitter(self, function, index, emitter):
        id = "__f__{}-{}".format(function, index)
        self._emitters[id] = emitter
        return id


class VrpcLocal(object):

    def __init__(self, module=None):
        self._vrpc = module
        self._caller = Caller(self._vrpc)

    def create(self, class_name, *args):
        json_string = {
            'targetId': class_name,
            'method': '__create__',
            'data': {}
        }
        data = json_string['data']
        for index, a in enumerate(args):
            data["_{}".format(index + 1)] = a

        # Create instance
        ret = json.loads(self._vrpc.callRemote(json.dumps(json_string)))
        instanceId = ret['data']['r']
        functions = json.loads(
            self._vrpc.getMemberFunctions(class_name)
        )['functions']
        functions = self._remove_overloads(functions)
        proxy = {
            # Python lambdas are broken, I can't simply make this a multi-line
            # statement. Sorry PEP8!
            '__init__': lambda self, vrpc, caller: Proxy.__init__(self, vrpc, caller)
        }
        for function in functions:
            proxy[function] = self._make_function(instanceId, function, *args)
        instance = type(class_name, (Proxy,), proxy)(self._vrpc, self._caller)
        return instance

    def call_static(self, class_name, function_name, *args):
        json_string = {
            'targetId': class_name,
            'method': function_name,
            'data': {}
        }
        # TODO Support callbacks!
        data = json_string['data']
        for index, a in enumerate(args):
            data["_{}".format(index + 1)] = a
        ret = json.loads(self._vrpc.callRemote(json.dumps(json_string)))
        if (ret['data'].get('e')):
            raise RuntimeError(ret['data']['e'])
        return ret['data']['r']

    def _remove_overloads(self, functions):
        uniqueFunctions = set()
        for function in functions:
            # Strip off overload signature
            index = function.find('-')
            if (index > 0):
                function = function[0:index]
            uniqueFunctions.add(function)
        return uniqueFunctions

    def _make_function(self, instance_id, function, *args):
        def f(self, *args):
            json_string = {
                'targetId': instance_id,
                'method': function,
                'data': self._packData(function, *args)
            }
            ret = json.loads(self._vrpc.callRemote(json.dumps(json_string)))
            if (ret['data'].get('e')):
                raise RuntimeError(ret['data']['e'])
            return ret['data']['r']
        return f
