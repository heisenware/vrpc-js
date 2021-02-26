TARGET = vrpc-foo-agent
CPPFLAGS = -I./third_party/include -pthread -fPIC -m64 -O3 -std=c++14
LDFLAGS = -pthread -L./third_party/lib
LDLIBS = -l:libvrpc_agent_pro.a

SRCS := $(shell find ./src -name *.cpp)
OBJS := $(addsuffix .o,$(basename $(SRCS)))
DEPS := $(OBJS:.o=.d)

$(TARGET): $(OBJS)
		$(CXX) $(LDFLAGS) $(OBJS) -o $@ $(LOADLIBES) $(LDLIBS)

.PHONY: clean
clean:
		$(RM) $(TARGET) $(OBJS) $(DEPS)

-include $(DEPS)
