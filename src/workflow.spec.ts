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
})

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

    assert.strictEqual(wf.can("draft", "publish"), "published");
    assert.strictEqual(wf.can("draft", "abort"), null);
    assert.strictEqual(wf.can("draft", "complete"), null);
    assert.strictEqual(wf.can("draft", "archive"), null);

    assert.strictEqual(wf.can("published", "publish"), null);
    assert.strictEqual(wf.can("published", "abort"), "aborted");
    assert.strictEqual(wf.can("published", "complete"), "completed");
    assert.strictEqual(wf.can("published", "archive"), null);

    assert.strictEqual(wf.can("aborted", "publish"), null);
    assert.strictEqual(wf.can("aborted", "abort"), null);
    assert.strictEqual(wf.can("aborted", "complete"), null);
    assert.strictEqual(wf.can("aborted", "archive"), "archived");

    assert.strictEqual(wf.can("completed", "publish"), null);
    assert.strictEqual(wf.can("completed", "abort"), null);
    assert.strictEqual(wf.can("completed", "complete"), null);
    assert.strictEqual(wf.can("completed", "archive"), "archived");

    assert.strictEqual(wf.can("invalid", "publish"), null);
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


describe("ClassWorkflow with Enum States", () => {
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

    assert.strictEqual(wf.can(post, "publish"), WorkflowStateEnum.Published);
    assert.strictEqual(wf.can(post, "abort"), null);
    assert.strictEqual(wf.can(post, "complete"), null);
    assert.strictEqual(wf.can(post, "archive"), null);

    wf.apply(post, "publish")
    assert.strictEqual(wf.can(post, "publish"), null);
    assert.strictEqual(wf.can(post, "abort"), WorkflowStateEnum.Aborted);
    assert.strictEqual(wf.can(post, "complete"), WorkflowStateEnum.Completed);
    assert.strictEqual(wf.can(post, "archive"), null);

    wf.apply(post, "abort")
    assert.strictEqual(wf.can(post, "archive"), WorkflowStateEnum.Archived);

    
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
          "The instance has an unexpected state '5'" 
        );
        return true;
      }
    );
  });
});
