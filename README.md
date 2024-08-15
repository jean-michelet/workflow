# Workflow

If you've been programming for a while, you've likely encountered workflows. They represent the various **states** and **transitions** that an entity can go through in a system.

For example, let's say you're developing a blog and want to allow users to share posts. You'll need to establish some rules:

- When a user creates a post, does it start as a `draft`?
- Can a post move directly from `draft` to `published`, or does it need to be `moderated` first?
- You might allow deleting `draft`s, but should `published` posts only be `archived`?

These kinds of questions can be tricky, and it's crucial to represent this logic clearly in your code.

## Install
```
npm i @jean-michelet/workflow
```

## Workflow class

The `Workflow` class allows you to define transitions between different states. These transitions can be represented as simple state changes (`Transition`) or as transitions with multiple origins (`MultiOriginTransition`).

In this example, the post can move from `draft` to `published`:

```ts
import { Transition, Workflow } from "@jean-michelet/workflow";

const workflow = new Workflow();

workflow.addTransition("publish", new Transition("draft", "published"));

console.log(workflow.can("publish", "draft")); // true
console.log(workflow.can("publish", "published")); // false
```

### Multi-Origin Transitions

A `MultiOriginTransition` allows an entity to transition to a single target state from multiple states.

In this example, the post can move to the `archived` state from either `aborted` or `completed` states:

```ts
import { MultiOriginTransition, Workflow } from "@jean-michelet/workflow";

const workflow = new Workflow();

workflow.addTransition(
  "archive",
  new MultiOriginTransition(["aborted", "completed"], "archived")
);

console.log(workflow.can("archive", "aborted")); // true
console.log(workflow.can("archive", "completed")); // true
```

## ClassWorkflow class

The `ClassWorkflow` allows you to check and apply transitions directly to an entity’s state property. It is particularly useful when working with classes that have a specific property representing their state.

### Example

Suppose you have a `Post` class with a `status` property that tracks the state of the post:

```ts
import { ClassWorkflow, Transition } from "@jean-michelet/workflow";

class Post {
  status = "draft";
}

const wf = new ClassWorkflow({
  entity: Post,
  stateProperty: "status",
});

wf.addTransition("publish", new Transition("draft", "published"));

const post = new Post();

if (wf.can("publish", post)) {
  wf.apply("publish", post);
}

console.log(post.status); // Output: "published"
```

In this example, the `ClassWorkflow` manages the state transitions of the `Post` instance. The `apply` method automatically updates the entity's `status` property based on the defined transitions. If the transition isn't allowed, an error is thrown.

### Handling unexpected states

Both `Workflow` and `ClassWorkflow` support a `detectUnexpectedState` option. When enabled, this option throws an error if an entity is in an unexpected state that hasn't been accounted for in the transitions.

```ts
import { ClassWorkflow, Transition } from "@jean-michelet/workflow";

class Post {
  status = "draft";
}

const wf = new ClassWorkflow({
  entity: Post,
  stateProperty: "status",
  detectUnexpectedState: true,
});

wf.addTransition("publish", new Transition("draft", "published"));

const post = new Post();
post.status = "unknown";

wf.can("publish", post); // throw an error "The instance has an unexpected state 'unknown'"
```
