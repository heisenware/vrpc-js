{
  'targets': [
    {
      'target_name': 'vrpc',
      'target_conditions': [
        ['"<!(echo $VRPC_DEBUG)"=="1"', {'defines': ['VRPC_DEBUG']}],
      ],
      'sources': [ 'cpp/addon.cpp' ],
      'include_dirs': [ 'cpp' ],
      'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
      'cflags_cc': ['-std=c++14', '-fPIC']
    }
  ],
  'conditions': [
    ['"<!(echo $BUILD_TESTS)"=="1"', {
      'targets': [
        {
          'target_name': 'vrpc_test',
          'target_conditions': [
            ['"<!(echo $VRPC_DEBUG)"=="1"', {'defines': ['VRPC_DEBUG']}],
          ],
          'defines': ['VRPC_COMPILE_AS_ADDON=<binding.cpp>'],
          'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
          'cflags_cc': ['-std=c++14'],
          'sources': [ 'cpp/addon.cpp' ],
          'include_dirs': [ 'cpp', 'test/fixtures' ]
        },
        {
          'target_name': 'vrpc-test',
          'target_conditions': [
            ['"<!(echo $VRPC_DEBUG)"=="1"', {'defines': ['VRPC_DEBUG']}],
          ],
          'type': 'executable',
          'sources': [
            'test/cpp/main.cpp',
            'test/cpp/vrpcTest.cpp'
          ],
          'include_dirs': [ 'third_party/include', 'cpp' ],
          'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
          'cflags_cc': ['-std=c++14']
        }
      ]
    }],
    ['"<!(echo $BUILD_EXAMPLE)"=="1"', {
      'targets': [
        {
          'target_name': 'vrpc_example',
          'target_conditions': [
            ['"<!(echo $VRPC_DEBUG)"=="1"', {'defines': ['VRPC_DEBUG']}],
          ],
          'defines': ['VRPC_COMPILE_AS_ADDON=<binding.cpp>'],
          'cflags_cc!': ['-std=gnu++0x', '-fno-rtti', '-fno-exceptions'],
          'cflags_cc': ['-std=c++14'],
          'sources': [ 'cpp/addon.cpp' ],
          'include_dirs': [ 'cpp', 'examples' ]
        }
      ]
    }]
  ]
}
