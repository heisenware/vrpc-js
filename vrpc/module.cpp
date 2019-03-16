/*
__/\\\________/\\\____/\\\\\\\\\______/\\\\\\\\\\\\\_________/\\\\\\\\\_
__\/\\\_______\/\\\__/\\\///////\\\___\/\\\/////////\\\____/\\\////////__
 __\//\\\______/\\\__\/\\\_____\/\\\___\/\\\_______\/\\\__/\\\/___________
  ___\//\\\____/\\\___\/\\\\\\\\\\\/____\/\\\\\\\\\\\\\/__/\\\_____________
   ____\//\\\__/\\\____\/\\\//////\\\____\/\\\/////////___\/\\\_____________
    _____\//\\\/\\\_____\/\\\____\//\\\___\/\\\____________\//\\\____________
     ______\//\\\\\______\/\\\_____\//\\\__\/\\\_____________\///\\\__________
      _______\//\\\_______\/\\\______\//\\\_\/\\\_______________\////\\\\\\\\\_
       ________\///________\///________\///__\///___________________\/////////__


Non-intrusively binds any C++ code and provides access in form of asynchronous
remote procedural callbacks (RPC).
Author: Dr. Dr. Burkhard C. Heisen (https://github.com/bheisen/vrpc)


Licensed under the MIT License <http://opensource.org/licenses/MIT>.
Copyright (c) 2018 Dr. Dr. Burkhard C. Heisen <burkhard.heisen@xsmail.com>.

Permission is hereby  granted, free of charge, to any  person obtaining a copy
of this software and associated  documentation files (the "Software"), to deal
in the Software  without restriction, including without  limitation the rights
to  use, copy,  modify, merge,  publish, distribute,  sublicense, and/or  sell
copies  of  the Software,  and  to  permit persons  to  whom  the Software  is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE  IS PROVIDED "AS  IS", WITHOUT WARRANTY  OF ANY KIND,  EXPRESS OR
IMPLIED,  INCLUDING BUT  NOT  LIMITED TO  THE  WARRANTIES OF  MERCHANTABILITY,
FITNESS FOR  A PARTICULAR PURPOSE AND  NONINFRINGEMENT. IN NO EVENT  SHALL THE
AUTHORS  OR COPYRIGHT  HOLDERS  BE  LIABLE FOR  ANY  CLAIM,  DAMAGES OR  OTHER
LIABILITY, WHETHER IN AN ACTION OF  CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE  OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#include <Python.h>
#include "vrpc.hpp"
#include "json.hpp"

#ifndef VRPC_WITH_DL
  #include <binding.cpp>
#endif

namespace vrpc_python_bindings {

  static PyObject* callRemote(PyObject* self, PyObject* args) {
    const char* json_string;
    // Check whether we got a string as single argument
    if (!PyArg_ParseTuple(args, "s", &json_string)) {
      PyErr_SetString(PyExc_TypeError, "Wrong argument type, expecting string");
      return NULL;
    }
    std::string ret;
    try {
      ret = vrpc::LocalFactory::call(json_string);
    } catch (const std::exception& e) {
      PyErr_SetString(PyExc_RuntimeError, e.what());
      return NULL;
    }
    return PyUnicode_FromString(ret.c_str());
  }

  static PyObject* getMemberFunctions(PyObject* self, PyObject* args) {
    const char* class_name;
    // Check whether we got a string as single argument
    if (!PyArg_ParseTuple(args, "s", &class_name)) {
      PyErr_SetString(PyExc_TypeError, "Wrong argument type, expecting string");
      return NULL;
    }
    std::string ret;
    try {
      auto functions = vrpc::LocalFactory::get_member_functions(class_name);
      vrpc::json j;
      j["functions"] = functions;
      ret = j.dump();
    } catch (const std::exception& e) {
      PyErr_SetString(PyExc_RuntimeError, e.what());
      return NULL;
    }
    return PyUnicode_FromString(ret.c_str());
  }

  static PyObject* getStaticFunctions(PyObject* self, PyObject* args) {
    const char* class_name;
    // Check whether we got a string as single argument
    if (!PyArg_ParseTuple(args, "s", &class_name)) {
      PyErr_SetString(PyExc_TypeError, "Wrong argument type, expecting string");
      return NULL;
    }
    std::string ret;
    try {
      auto functions = vrpc::LocalFactory::get_static_functions(class_name);
      vrpc::json j;
      j["functions"] = functions;
      ret = j.dump();
    } catch (const std::exception& e) {
      PyErr_SetString(PyExc_RuntimeError, e.what());
      return NULL;
    }
    return PyUnicode_FromString(ret.c_str());
  }

  static PyObject* callback_handler = NULL;

  static void cppCallbackHandler(const vrpc::json& j) {
    _VRPC_DEBUG << "will call back with " << j << std::endl;
    PyObject* arglist = Py_BuildValue("(s)", j.dump().c_str());
    PyObject* result = PyObject_CallObject(callback_handler, arglist);
    Py_DECREF(arglist);
  }

  static PyObject* onCallback(PyObject*, PyObject* args) {
    PyObject* result = NULL;
    PyObject* tmp;

    if (PyArg_ParseTuple(args, "O:set_callback", &tmp)) {
      if (!PyCallable_Check(tmp)) {
        PyErr_SetString(PyExc_TypeError, "parameter must be callable");
        return NULL;
      }
      Py_XINCREF(tmp); // Add a reference to new callback
      Py_XDECREF(callback_handler); // Dispose of previous callback
      callback_handler = tmp; // Remember new callback
      // Boilerplate to return "None"
      Py_INCREF(Py_None);
      result = Py_None;
      // Register in vrpc
      vrpc::Callback::register_callback_handler(
        std::bind(cppCallbackHandler, std::placeholders::_1)
      );
    }
    return result;
  }

  // Define functions in module
  static PyMethodDef VrpcMethods[] = {
    {
      "callRemote",
      callRemote,
      METH_VARARGS,
      "Call bound C++ function"
    },
    {
      "getMemberFunctions",
      getMemberFunctions,
      METH_VARARGS,
      "Lists all available member functions for requested class"
    },
    {
      "getStaticFunctions",
      getStaticFunctions,
      METH_VARARGS,
      "Lists all available static function for requested class"
    },
    {
      "onCallback",
      onCallback,
      METH_VARARGS,
      "Sets callback handler for all vrpc callbacks"
    },
    {NULL, NULL, 0, NULL}  // Sentinel
  };

  static struct PyModuleDef vrpc_module = {
    PyModuleDef_HEAD_INIT,
    // name of module
    VRPC_MODULE_NAME,
    // module documentation, may be NULL
    NULL,
    // size of per-interpreter state of the module or -1 if the module keeps state in global variables
    -1,
    VrpcMethods
};

  // Module initialization
  PyMODINIT_FUNC \
  VRPC_MODULE_FUNC(void) {
    return PyModule_Create(&vrpc_module);
  }
}
