from setuptools import setup, Extension, find_packages
from os import environ, path

README_rst = path.join(path.abspath(path.dirname(__file__)), 'README.rst')

with open(README_rst, 'r') as f:
    long_description = f.read()

test_module = Extension(
    'vrpc_test_ext',
    include_dirs=['./vrpc', './test/fixtures'],
    define_macros=[
        ('VRPC_MODULE_NAME', '"vrpc_test_ext"'),
        ('VRPC_MODULE_FUNC', 'PyInit_vrpc_test_ext')
    ],
    extra_compile_args=['-std=c++14', '-fPIC'],
    sources=['./vrpc/module.cpp'],
    language='c++'
)

example_module = Extension(
    'vrpc_example_ext',
    include_dirs=['./vrpc', './examples'],
    define_macros=[
        ('VRPC_MODULE_NAME', '"vrpc_example_ext"'),
        ('VRPC_MODULE_FUNC', 'PyInit_vrpc_example_ext')
    ],
    extra_compile_args=['-std=c++14', '-fPIC'],
    sources=['./vrpc/module.cpp'],
    language='c++'
)

ext_modules = []
if environ.get('BUILD_TEST') == '1':
    ext_modules.append(test_module)
if environ.get('BUILD_EXAMPLE') == '1':
    ext_modules.append(example_module)

setup(
    name='vrpc',
    version='2.4.0',
    license='MIT',
    description='Variadic Remote Procedure Calls',
    long_description=long_description,
    long_description_content_type='text/x-rst',
    author='Burkhard C. Heisen',
    author_email='burkhard.heisen@heisenware.com',
    packages=find_packages(),
    package_data={
        'vrpc': ['module.cpp', 'vrpc.hpp', 'json.hpp'],
    },
    classifiers=[
        'Programming Language :: Python :: 3',
    ],
    keywords=[
        'c++-to-python', 'language-bindings', 'iot', 'rpc', 'bindings',
        'c++14', 'bindings-generator', 'remote-procedure-call'
    ],
    python_requires='>=3',
    ext_modules=ext_modules
)
