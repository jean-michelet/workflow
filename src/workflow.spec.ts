import { describe, it } from "node:test";
import assert from "node:assert";
import {
  ClassWorkflow,
  MultiOriginTransition,
  Transition,
  Workflow,
} from "./workflow.js";

describe("BaseWorkflow - Common to all workflows", () => {
  it("should throw an error when invalid transition", () => {
    const wf = new Workflow({
      detectUnexpectedState: true,
    });

    assert.throws(
      () => wf.can("draft", "invalid_transition"),
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

describe("Workflow", () => {
  it("should transition as expected", () => {
    const wf = new Workflow();

    wf.addTransition("publish", new Transition("draft", "published"));
    wf.addTransition("abort", new Transition("published", "aborted"));
    wf.addTransition("complete", new Transition("published", "completed"));
    wf.addTransition(
      "archive",
      new MultiOriginTransition(["aborted", "completed"], "archived")
    );

    assert.ok(wf.can("draft", "publish"));
    assert.ok(!wf.can("draft", "abort"));
    assert.ok(!wf.can("draft", "complete"));
    assert.ok(!wf.can("draft", "archive"));

    assert.ok(!wf.can("published", "publish"));
    assert.ok(wf.can("published", "abort"));
    assert.ok(wf.can("published", "complete"));
    assert.ok(!wf.can("published", "archive"));

    assert.ok(!wf.can("aborted", "publish"));
    assert.ok(!wf.can("aborted", "abort"));
    assert.ok(!wf.can("aborted", "complete"));
    assert.ok(wf.can("aborted", "archive"));

    assert.ok(!wf.can("completed", "publish"));
    assert.ok(!wf.can("completed", "abort"));
    assert.ok(!wf.can("completed", "complete"));
    assert.ok(wf.can("completed", "archive"));

    assert.ok(!wf.can("invalid", "publish"));
  });

  it("should detect unexpected state if 'detectUnexpectedState = true'", () => {
    const wf = new Workflow({
      detectUnexpectedState: true,
    });

    wf.addTransition("publish", new Transition("draft", "published"));

    assert.throws(
      () => wf.can("invalid", "publish"),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          "The instance has an unexpected state 'invalid'"
        );
        return true;
      }
    );
  });
});

describe("ClassWorkflow", () => {
  enum WorkflowStateEnum {
    Draft = 0,
    Published = 1,
    Aborted = 2,
    Completed = 3,
    Archived = 4,
    Unused = 5, // to trigger unexpected state error
  }

  class Post {
    status: WorkflowStateEnum = WorkflowStateEnum.Draft;
  }

  it("should transition as expected", () => {
    const wf = new ClassWorkflow({
      entity: Post,
      stateProperty: "status",
    });

    wf.addTransition(
      "publish",
      new Transition(WorkflowStateEnum.Draft, WorkflowStateEnum.Published)
    );
    wf.addTransition(
      "abort",
      new Transition(WorkflowStateEnum.Published, WorkflowStateEnum.Aborted)
    );
    wf.addTransition(
      "complete",
      new Transition(WorkflowStateEnum.Published, WorkflowStateEnum.Completed)
    );
    wf.addTransition(
      "archive",
      new MultiOriginTransition(
        [WorkflowStateEnum.Aborted, WorkflowStateEnum.Completed],
        WorkflowStateEnum.Archived
      )
    );

    const post = new Post();
    assert.ok(wf.can(post, "publish"));
    assert.ok(!wf.can(post, "abort"));
    assert.ok(!wf.can(post, "complete"));
    assert.ok(!wf.can(post, "archive"));

    wf.apply(post, "publish");
    assert.ok(!wf.can(post, "publish"));
    assert.ok(wf.can(post, "abort"));
    assert.ok(wf.can(post, "complete"));
    assert.ok(!wf.can(post, "archive"));

    wf.apply(post, "abort");
    assert.ok(wf.can(post, "archive"));

    assert.throws(
      () => wf.apply(post, "complete"),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          "Can't apply transition 'complete' to current state '2'"
        );
        return true;
      }
    );
  });

  it("should throw an error if the stateProperty does not exist on the entity", () => {
    assert.throws(
      () =>
        new ClassWorkflow({
          entity: Post,
          // @ts-expect-error - This is a deliberate invalid property for the test
          stateProperty: "nonExistentProperty",
        }),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          "Property 'nonExistentProperty' does not exist in the provided entity."
        );
        return true;
      }
    );
  });

  it("should detect unexpected state if 'detectUnexpectedState = true'", () => {
    const wf = new ClassWorkflow({
      entity: Post,
      stateProperty: "status",
      detectUnexpectedState: true,
    });

    wf.addTransition(
      "publish",
      new Transition(WorkflowStateEnum.Draft, WorkflowStateEnum.Published)
    );

    const post = new Post();
    post.status = WorkflowStateEnum.Unused;

    assert.throws(
      () => wf.can(post, "publish"),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          "The instance has an unexpected state '5'" // `5` corresponds to `WorkflowStateEnum.Unused`
        );
        return true;
      }
    );
  });
});
