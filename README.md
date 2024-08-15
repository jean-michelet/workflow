# Workflow

If you've been programming for a while, you've likely encountered workflows. They represent the various **states** and **transitions** that an entity can go through in a system.

For example, let's say you're developing a blog and want to allow users to share posts. You'll need to establish some rules:

- When a user creates a post, does it start as a `draft`?
- Can a post move directly from `draft` to `published`, or does it need to be `moderated` first?
- You might allow deleting `draft`s, but should `published` posts only be `archived`?

These kinds of questions can be tricky, and it's crucial to represent this logic clearly in your code.

## Workflow class

The `Workflow` class allows you to define transitions between different states. These transitions can be represented as simple state changes (`Transition`) or as transitions with multiple origins (`MultiOriginTransition`).

### Example

In this example, the post can move from `draft` to `published`:
```ts
const workflow = new Workflow();

workflow.addTransition("publish", new Transition("draft", "published"));

const canPublish = workflow.can("draft", "publish"); // true
```

```ts
const canRepublish = workflow.can("published", "publish"); // false
```

### Multi-Origin Transitions

A `MultiOriginTransition` allows an entity to transition to a single target state from multiple states.

In this example, the post can move to the `archived` state from either `aborted` or `completed` states:
```ts
const workflow = new Workflow();

workflow.addTransition(
  "archive",
  new MultiOriginTransition(["aborted", "completed"], "archived")
);

workflow.can("aborted", "archive"); // true
workflow.can("completed", "archive"); // true
```

## ClassWorkflow Class

The `ClassWorkflow` allows you to apply transitions directly to an entity’s state property. It is particularly useful when working with classes or objects that have a specific property representing their state.

### Example: ClassWorkflow

Suppose you have a `Post` class with a `status` property that tracks the state of the post:

```ts
class Post {
  status = "draft";
}

const wf = new ClassWorkflow({
  entity: Post,
  stateProperty: "status",
});

wf.addTransition("publish", new Transition("draft", "published"));
wf.addTransition(
  "archive",
  new MultiOriginTransition(["aborted", "completed"], "archived")
);

const post = new Post();

if (wf.can(post, "publish")) {
  wf.apply(post, "publish");
}

console.log(post.status); // Output: "published"
```

In this example, the `ClassWorkflow` manages the state transitions of the `Post` instance. The `apply` method automatically updates the entity's `status` property based on the defined transitions. If the transition isn't allowed, an error is thrown, ensuring that invalid transitions are handled properly.

### Handling Unexpected States

Both `Workflow` and `ClassWorkflow` support a `detectUnexpectedState` option. When enabled, this option throws an error if an entity is in an unexpected state that hasn't been accounted for in the transitions.

```ts
const wf = new ClassWorkflow({
  entity: Post,
  stateProperty: "status",
  detectUnexpectedState: true,
});

const post = new Post();
post.status = "unknown";

wf.apply(post, "publish"); // throw an error "The instance has an unexpected state 'unknown'"
```
