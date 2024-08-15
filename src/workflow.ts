export type State = string | number;

export interface ITransition {
  tryTransition(status: State): State | null;
}

export class Transition implements ITransition {
  public readonly from: State;
  public readonly to: State;
  constructor(from: State, to: State) {
    this.from = from;
    this.to = to;
  }

  tryTransition(state: State): State | null {
    if (state === this.from) {
      return this.to;
    }

    return null;
  }
}

export class MultiOriginTransition implements ITransition {
  public readonly from: State[];
  public readonly to: State;
  constructor(from: State[], to: State) {
    this.from = from;
    this.to = to;
  }

  tryTransition(state: State): State | null {
    if (this.from.includes(state)) {
      return this.to;
    }

    return null;
  }
}

export interface BaseWorkflowOptions {
  detectUnexpectedState?: boolean;
}

export abstract class BaseWorkflow {
  public transitions: Map<string, ITransition> = new Map();
  protected detectUnexpectedState: boolean;
  protected states = new Set<State>();

  constructor(options: BaseWorkflowOptions = {}) {
    this.detectUnexpectedState = options.detectUnexpectedState ?? false;
  }

  addTransition(name: string, transition: ITransition): void {
    if (!this.transitions.has(name)) {
      this.transitions.set(name, transition);
    }
  }

  getTransition(name: string) {
    const transition = this.transitions.get(name);
    if (!transition) {
      throw new Error(`Transition '${name}' not found.`);
    }

    return transition;
  }

  protected doDetectUnexpectedState(currentState: State) {
    if (this.detectUnexpectedState && !this.states.has(currentState)) {
      throw new Error(
        `The instance has an unexpected state '${currentState.toString()}'`
      );
    }
  }
}

export class Workflow extends BaseWorkflow {
  /**
   * Try to perform the transition
   * If success, return the next state
   * If fails, return null
   */
  can(transitionName: string, currentState: State) {
    const transition = this.getTransition(transitionName);

    const state = transition.tryTransition(currentState);
    if (state) return true;

    this.doDetectUnexpectedState(currentState);

    return false;
  }
}

type Constructor<T = object> = new (...args: unknown[]) => T;
export interface ClassWorkflowOptions<T> extends BaseWorkflowOptions {
  entity: Constructor<T>;
  stateProperty: Extract<
    {
      [K in keyof T]: T[K] extends string | number ? K : never;
    }[keyof T],
    keyof T
  >;
  detectUnexpectedState?: boolean;
}

export class ClassWorkflow<T> extends BaseWorkflow {
  private entity: Constructor<T>;
  private stateProperty: keyof T;

  constructor(options: ClassWorkflowOptions<T>) {
    super({
      detectUnexpectedState: options.detectUnexpectedState ?? false,
    });

    this.entity = options.entity;
    this.stateProperty = options.stateProperty;

    this.validateProperty();
  }

  can(transitionName: string, instance: T) {
    const currentState = instance[this.stateProperty] as unknown as
      | string
      | number;

    const transition = this.getTransition(transitionName);
    const nextState = transition.tryTransition(currentState);
    if (nextState !== null) {
      return true;
    }

    this.doDetectUnexpectedState(currentState);

    return false;
  }

  apply(transitionName: string, instance: T) {
    const currentState = instance[this.stateProperty] as unknown as
      | string
      | number;

    const transition = this.getTransition(transitionName);
    const nextState = transition.tryTransition(currentState);
    if (!nextState) {
      throw new Error(
        `Can't apply transition '${transitionName}' to current state '${
          instance[this.stateProperty]
        }'`
      );
    }

    instance[this.stateProperty] = nextState as T[keyof T];
  }

  private validateProperty() {
    const entity = new this.entity();
    if (typeof entity[this.stateProperty] === "undefined") {
      throw new Error(
        `Property '${String(
          this.stateProperty
        )}' does not exist in the provided entity.`
      );
    }
  }
}
