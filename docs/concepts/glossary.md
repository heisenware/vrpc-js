# Glossary

The words the VRPC documentation uses, each in one meaning. The
[protocol specification](../spec/protocol.md#3-terms) defines the ones the
wire depends on.

| Term | Meaning |
| --- | --- |
| **Adapter** | The part of an agent that holds the registered classes and their instances, and executes calls on them (`VrpcAdapter`). |
| **Agent** | A program, or the part of one, that offers its classes to clients over the broker (`VrpcAgent`). Has a name unique in its domain. |
| **Agent info** | What an agent publishes about itself, retained: online or offline, its host, its version, its protocol version. |
| **Answer** | An agent's reply to a request: a result or an error. |
| **Broker** | The MQTT broker every agent and client connects to. |
| **callAll** | One call of a member function on every shared instance of a class; answers one entry per instance. |
| **Callback** | A function passed as an argument, which the agent calls back into the caller - once, or a few times during the call. |
| **Class info** | What an agent publishes about each class, retained: its static and member functions, its shared instances and, in full, their documentation. |
| **Client** | A program, or the part of one, that calls agents (`VrpcClient`). |
| **Connection id** | The name of one client connection, `<domain>/<mqttClientId>/<secret>`. Answers, callbacks and events for that connection travel on topics under it. |
| **Context** | What a request addresses: an instance, or a class for its static functions. |
| **Declare** | To subscribe: a call of an event function that carries a subscription id. |
| **Delete** | To end an instance for good; it releases what it runs. |
| **Domain** | A name that groups agents and clients; they see and reach each other within one domain only. |
| **End** | A decided stop of a registration: its source ended it, or somebody did on purpose. Its subscribers are told. |
| **Event function** | A function that calls a handler again and again until it is released, such as `onReading(handler)`. |
| **Greeting** | What a registration hands every new subscriber first, usually its current state. |
| **Heal** | To restore a lost subscription by declaring it again once its agent is back. |
| **Instance** | A named object of a class, kept by an agent. **Shared** instances are visible to every client; **isolated** ones belong to the connection that created them. |
| **Loss** | A stop nobody decided: the agent went offline, or the instance went away. Heals when the agent is back. |
| **Owner** | The connection that created an isolated instance; the only one that may use it. |
| **Presence** | A client connection's last will, `offline`, on `<connectionId>/__clientInfo__`. Agents watch it to clean up after a connection. |
| **Protocol version** | The version of the VRPC protocol a peer speaks (`v`); currently 4. |
| **Proxy** | The object a client hands out for an instance or a class; its functions call the real ones remotely. |
| **Registration** | The one call of an event function on one instance (or class) with one set of arguments, shared by every subscription that asks for the same. The agent owns it. |
| **Registration object** | What an event function returns: how to undo its call, and optionally how to greet, when it ended and what to answer. |
| **Release** | To undo a registration once its last subscription left. |
| **Request** | A client's message asking an agent to call a function. |
| **Subscription** | One listener's wish to receive the events of a registration. The client owns it. |
| **Subscription id** | The name of a subscription, `__e__<connectionId>/<topicId>`; events travel to the topic it names. A secret of its connection. |
| **Will** | The message the broker publishes for a peer whose connection breaks: an agent's agent info `offline`, a client's presence. |
| **Withdraw** | To end a subscription on purpose. |
