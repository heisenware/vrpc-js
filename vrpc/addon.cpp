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


Enables Node.js to run VRPC as native addon.
Author: Dr. Burkhard C. Heisen (https://github.com/bheisen/vrpc)


Licensed under the MIT License <http://opensource.org/licenses/MIT>.
Copyright (c) 2018 - 2020 Dr. Burkhard C. Heisen <burkhard.heisen@heisenware.com>.

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

#include <node.h>

#include "json.hpp"
#include "vrpc.hpp"

#ifndef VRPC_WITH_DL
#include <binding.cpp>
#endif

namespace vrpc_bindings {

using v8::Context;
using v8::Exception;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::NewStringType;
using v8::Object;
using v8::Persistent;
using v8::String;
using v8::Value;

std::string singleArgToString(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // Check the number of arguments passed
  if (args.Length() < 1) {
    // Throw an Error that is passed back to JavaScript
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate,
                            "Wrong number of arguments, expecting exactly one",
                            NewStringType::kNormal)
            .ToLocalChecked()));
    return std::string();
  }

  // Check the argument type
  if (!args[0]->IsString()) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong argument type, expecting string",
                            NewStringType::kNormal)
            .ToLocalChecked()));
    return std::string();
  }

  String::Utf8Value utf8Buffer(isolate, args[0]);
  if (utf8Buffer.length() == 0) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(
            isolate, "Failed converting argument to valid and non-empty string",
            NewStringType::kNormal)
            .ToLocalChecked()));
    return std::string();
  }
  return *utf8Buffer;
}

void call(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // Expect one argument and parse it to std::string
  std::string arg = singleArgToString(args);
  if (arg.empty())
    return;

  std::string ret;
  try {
    ret = vrpc::LocalFactory::call(arg);
  } catch (const std::exception& e) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, e.what(), NewStringType::kNormal)
            .ToLocalChecked()));
    return;
  }
  Local<String> localString =
      String::NewFromUtf8(isolate, ret.c_str(), NewStringType::kNormal)
          .ToLocalChecked();

  // Set the return value (using the passed in
  // FunctionCallbackInfo<Value>&)
  args.GetReturnValue().Set(localString);
}

void loadBindings(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // Expect one argument and parse it to std::string
  std::string arg = singleArgToString(args);
  if (arg.empty())
    return;

  // Perform the operation
  try {
    vrpc::LocalFactory::load_bindings(arg);
  } catch (const std::exception& e) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, e.what(), NewStringType::kNormal)
            .ToLocalChecked()));
    return;
  }
}

void getClasses(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  std::string ret;
  try {
    auto classes = vrpc::LocalFactory::get_classes();
    ret = vrpc::json(classes).dump();
  } catch (const std::exception& e) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, e.what(), NewStringType::kNormal)
            .ToLocalChecked()));
    return;
  }
  Local<String> localString =
      String::NewFromUtf8(isolate, ret.c_str(), NewStringType::kNormal)
          .ToLocalChecked();
  args.GetReturnValue().Set(localString);
}

void getInstances(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // Expect one argument and parse it to std::string
  std::string arg = singleArgToString(args);
  if (arg.empty())
    return;

  std::string ret;
  try {
    auto instances = vrpc::LocalFactory::get_instances(arg);
    ret = vrpc::json(instances).dump();
  } catch (const std::exception& e) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, e.what(), NewStringType::kNormal)
            .ToLocalChecked()));
    return;
  }
  Local<String> localString =
      String::NewFromUtf8(isolate, ret.c_str(), NewStringType::kNormal)
          .ToLocalChecked();
  args.GetReturnValue().Set(localString);
}

void getMemberFunctions(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // Expect one argument and parse it to std::string
  std::string arg = singleArgToString(args);
  if (arg.empty())
    return;

  std::string ret;
  try {
    auto functions = vrpc::LocalFactory::get_member_functions(arg);
    ret = vrpc::json(functions).dump();
  } catch (const std::exception& e) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, e.what(), NewStringType::kNormal)
            .ToLocalChecked()));
    return;
  }
  Local<String> localString =
      String::NewFromUtf8(isolate, ret.c_str(), NewStringType::kNormal)
          .ToLocalChecked();
  args.GetReturnValue().Set(localString);
}

void getStaticFunctions(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // Expect one argument and parse it to std::string
  std::string arg = singleArgToString(args);
  if (arg.empty())
    return;

  std::string ret;
  try {
    auto functions = vrpc::LocalFactory::get_static_functions(arg);
    ret = vrpc::json(functions).dump();
  } catch (const std::exception& e) {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(isolate, e.what(), NewStringType::kNormal)
            .ToLocalChecked()));
    return;
  }
  Local<String> localString =
      String::NewFromUtf8(isolate, ret.c_str(), NewStringType::kNormal)
          .ToLocalChecked();
  args.GetReturnValue().Set(localString);
}

Persistent<Function> callback_handler;

void cppCallbackHandler(Isolate* isolate, const vrpc::json& json) {
  _VRPC_DEBUG << "will call back with " << json << std::endl;
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  Local<Function> cb = Local<Function>::New(isolate, callback_handler);
  const unsigned argc = 1;
  Local<Value> argv[argc] = {
      String::NewFromUtf8(isolate, json.dump().c_str(), NewStringType::kNormal)
          .ToLocalChecked()};
  cb->Call(context, Null(isolate), argc, argv).ToLocalChecked();
}

void onCallback(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  callback_handler.Reset(isolate, Local<Function>::Cast(args[0]));
  vrpc::Callback::register_callback_handler(
      std::bind(cppCallbackHandler, isolate, std::placeholders::_1));
}

void Init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "loadBindings", loadBindings);
  NODE_SET_METHOD(exports, "getClasses", getClasses);
  NODE_SET_METHOD(exports, "getInstances", getInstances);
  NODE_SET_METHOD(exports, "getMemberFunctions", getMemberFunctions);
  NODE_SET_METHOD(exports, "getStaticFunctions", getStaticFunctions);
  NODE_SET_METHOD(exports, "call", call);
  NODE_SET_METHOD(exports, "onCallback", onCallback);
}

NODE_MODULE(vrpc, Init)
}  // namespace vrpc_bindings
