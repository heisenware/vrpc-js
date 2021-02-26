#include <vrpc.hpp>
#include <vrpc_agent.hpp>

#include "Foo.hpp"

// Bind functions to be remotely callable
namespace vrpc {

  // Bind constructor
  // Needs: class, [arg1-type, [arg2-type...]]
  VRPC_CTOR(Foo);

  // Bind const member function
  // Needs: class, return-type, function, [arg1-type, [arg2-type...]]
  VRPC_CONST_MEMBER_FUNCTION(Foo, int, getValue)

  // Bind non-const member function
  // Needs: class, return-type, function, [arg1-type, [arg2-type...]]
  VRPC_MEMBER_FUNCTION(Foo, void, setValue, int)
}

int main(int argc, char** argv) {
  auto agent = vrpc::VrpcAgent::from_commandline(argc, argv);
  if (agent) agent->serve();
  return EXIT_SUCCESS;
}
