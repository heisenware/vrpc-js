from setuptools import setup, Extension, find_packages

module = Extension(
    'vrpc_test',
    include_dirs=['./vrpc', './test/fixtures'],
    define_macros=[
        ('VRPC_COMPILE_AS_ADDON', '<binding.cpp>'),
        ('VRPC_MODULE_NAME', '"vrpc_test"'),
        ('VRPC_MODULE_FUNC', 'PyInit_vrpc_test')
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
    ext_modules=[module]
)
