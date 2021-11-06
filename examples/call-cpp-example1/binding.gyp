{
  'variables': {
    'vrpc_path': '<!(if [ -e ../vrpc ]; then echo ../vrpc; else echo node_modules/vrpc; fi)'
  },
  'targets': [
    {
      'target_name': 'vrpc_foo',  # name of the extension
      'defines': [],  # any pre-processor defines you need
      'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
      'cflags_cc': ['-std=c++14', '-fPIC'],
      'include_dirs': [  # include dirs to be found
        '<(vrpc_path)',
        'src'
      ],
      'sources': [  # sources to be compiled
        '<(vrpc_path)/addon.cpp', # builds the VRPC adapter
      ]
    }
  ]
}
