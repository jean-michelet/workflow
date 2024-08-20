# Workflow
Workflows represent the various **states** and **transitions** that an entity can go through in a system. For example, let's say you're developing a task management application. You'll need to establish some rules:

- When a user creates a task, does it start as `new`?
- Can a task move directly from `in progress` to `completed`, or does it need to be `reviewed` first?
- You might allow deleting `new` tasks, but should `completed` tasks only be `archived`?

These kinds of questions can be tricky, and it's crucial to represent this logic clearly in your code.

## Install

```bash
npm i @jean-michelet/workflow
```

## Workflow

The `Workflow` class lets you define state transitions and apply them to the state property of an entity. You can define transitions from a single state or from multiple states.

In this example, a task can move through several stages in its lifecycle: from `new` to `in progress`, then either to `completed` or `canceled`, and finally be archived from either the `canceled` or `completed` states:

```ts
// Example in typecript, but also works with vanilla JS
import {
  Transition,
  MultiOriginTransition,
  Workflow,
} from "@jean-michelet/workflow";

class Task {
  status = "new";
}

const workflow = new Workflow<Task>({
  stateProperty: "status",
});

workflow.addTransition("start", new Transition("new", "in progress"));
workflow.addTransition("complete", new Transition("in progress", "completed"));
workflow.addTransition("cancel", new Transition("in progress", "canceled"));
workflow.addTransition(
  "archive",
  new MultiOriginTransition(["canceled", "completed"], "archived")
);

const task = new Task();

if (workflow.can("start", task)) {
  workflow.apply("start", task);
}
console.log(task.status); // Output: "in progress"

if (workflow.can("cancel", task)) {
  workflow.apply("cancel", task);
}
console.log(task.status); // Output: "canceled"

if (workflow.can("archive", task)) {
  workflow.apply("archive", task);
}
console.log(task.status); // Output: "archived"
```

### Handling Unexpected States

The `Workflow` class supports a `detectUnexpectedState` option. When enabled, this option throws an error if an entity is in an unexpected state that hasn't been accounted for in the defined transitions:

```ts
// Example in typecript, but also works with vanilla JS
import { Workflow, Transition } from "@jean-michelet/workflow";

class Task {
  status = "unknown";
}

const workflow = new Workflow<Task>({
  stateProperty: "status",
  detectUnexpectedState: true,
});

workflow.addTransition("start", new Transition("new", "in progress"));

const task = new Task();

workflow.can("start", task); // Error: "The instance has an unexpected state 'unknown'"
```
