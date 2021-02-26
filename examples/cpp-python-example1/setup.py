from distutils.sysconfig import get_python_lib
from setuptools import setup, Extension
from os import path
import subprocess
import re

res = subprocess.run(
    ['pip3', 'show', 'vrpc', '--disable-pip-version-check'], stdout=subprocess.PIPE)
install_path = re.search('Location: (.*)', res.stdout.decode('utf-8')).group(1)
vrpc_path = path.join(install_path, 'vrpc')
vrpc_module_cpp = path.join(vrpc_path, 'module.cpp')

module = Extension(
    'vrpc_foo', # Your module name here
    include_dirs=[vrpc_path, './src'],
    define_macros=[
        ('VRPC_MODULE_NAME', '"vrpc_foo"'), # and here
        ('VRPC_MODULE_FUNC', 'PyInit_vrpc_foo') # and again here
    ],
    extra_compile_args=['-std=c++14', '-fPIC'],
    sources=[vrpc_module_cpp],
    language='c++'
)

setup(
    name='vrpc-python-example1',
    install_requires=['vrpc'],
    ext_modules=[module]
)
