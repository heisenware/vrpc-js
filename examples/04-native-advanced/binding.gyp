{
  'variables': {
    'vrpc_path': '<!(if [ -e ../vrpc ]; then echo ../vrpc; else echo node_modules/vrpc; fi)'
  },
  'targets': [
    {
      'target_name': 'vrpc_bar',  # name of the extension
      'defines': [],
      'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
      'cflags_cc': ['-std=c++14', '-fPIC'],
      'include_dirs': [  # include dirs that need to be found
        '<(vrpc_path)',
        'src'
      ],
      'sources': [
        '<(vrpc_path)/vrpc/addon.cpp', # the VRPC adapter code
        'src/Bar.cpp' # our given C++ code
      ],
      'link_settings': {
        'libraries': [  # System library dependencies, e.g.
          # '-lpthread'
        ],
        'ldflags': [  # Linker flags
          # '-Wl,-rpath,\$$ORIGIN/runtime/path/to/local/lib',
          # '-L<!(pwd)/compiletime/path/to/local/lib'
        ]
      },
    }
  ]
}
