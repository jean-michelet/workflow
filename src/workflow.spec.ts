import { describe, it } from "node:test";
import assert from "node:assert";
import {
  MultiOriginTransition,
  Transition,
  Workflow,
} from "./workflow.js";

describe("Workflow", () => {
  enum TaskState {
    New = "new",
    InProgress = "in progress",
    Completed = "completed",
    Canceled = "canceled",
    Archived = "archived",
    Unused = "unused", // to trigger unexpected state error
  }

  class Task {
    status: TaskState = TaskState.New;
  }

  it("should transition as expected", () => {
    const wf = new Workflow<Task>({
      stateProperty: "status",
    });

    wf.addTransition(
      "start",
      new Transition(TaskState.New, TaskState.InProgress)
    );
    wf.addTransition(
      "complete",
      new Transition(TaskState.InProgress, TaskState.Completed)
    );
    wf.addTransition(
      "cancel",
      new Transition(TaskState.InProgress, TaskState.Canceled)
    );
    wf.addTransition(
      "archive",
      new MultiOriginTransition(
        [TaskState.Canceled, TaskState.Completed],
        TaskState.Archived
      )
    );

    const task = new Task();
    assert.ok(wf.can("start", task));
    assert.ok(!wf.can("complete", task));
    assert.ok(!wf.can("cancel", task));
    assert.ok(!wf.can("archive", task));

    wf.apply("start", task);
    assert.ok(!wf.can("start", task));
    assert.ok(wf.can("complete", task));
    assert.ok(wf.can("cancel", task));
    assert.ok(!wf.can("archive", task));

    // test multiple origin
    task.status = TaskState.Canceled
    assert.ok(wf.can("archive", task));

    task.status = TaskState.Completed
    assert.ok(wf.can("archive", task));

    wf.apply("archive", task)

    assert.throws(
      () => wf.apply("start", task),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          "Can't apply transition 'start' to current state 'archived'"
        );
        return true;
      }
    );
  });

  it("should detect unexpected state if 'detectUnexpectedState = true'", () => {
    const wf = new Workflow<Task>({
      stateProperty: "status",
      detectUnexpectedState: true,
    });

    wf.addTransition(
      "start",
      new Transition(TaskState.New, TaskState.InProgress)
    );

    const task = new Task();
    task.status = TaskState.Unused;

    assert.throws(
      () => wf.can("start", task),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          "The instance has an unexpected state 'unused'"
        );
        return true;
      }
    );
  });

  it("should throw an error when invalid transition", () => {
    const wf = new Workflow<Task>({
      stateProperty: "status",
      detectUnexpectedState: true,
    });

    const task = new Task();

    assert.throws(
      () => wf.can("invalid_transition", task),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          "Transition 'invalid_transition' not found."
        );
        return true;
      }
    );
  });
});

