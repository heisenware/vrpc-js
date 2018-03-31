from setuptools import setup, Extension, find_packages

test_module = Extension(
    'vrpc_test_ext',
    include_dirs=['./vrpc', './test/fixtures'],
    define_macros=[
        ('VRPC_COMPILE_AS_ADDON', '<binding.cpp>'),
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
        ('VRPC_COMPILE_AS_ADDON', '<binding.cpp>'),
        ('VRPC_MODULE_NAME', '"vrpc_example_ext"'),
        ('VRPC_MODULE_FUNC', 'PyInit_vrpc_example_ext')
    ],
    extra_compile_args=['-std=c++14', '-fPIC'],
    sources=['./vrpc/module.cpp'],
    language='c++'
)

setup(
    name='vrpc',
    version='1.0',
    description='Python bindings for vrpc',
    author='Burkhard C. Heisen',
    author_email='burkhard.heisen@xsmail.com',
    packages=find_packages(),
    package_data={
        'vrpc': ['module.cpp', 'vrpc.hpp', 'json.hpp'],
    },
    ext_modules=[test_module, example_module]
)
