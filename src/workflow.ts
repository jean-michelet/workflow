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

export interface WorkflowOptions<T> {
  stateProperty: Extract<
    {
      [K in keyof T]: T[K] extends string | number ? K : never;
    }[keyof T],
    keyof T
  >;
  detectUnexpectedState?: boolean;
}

export class Workflow<T = object> {
  public transitions: Map<string, ITransition> = new Map();
  protected detectUnexpectedState: boolean;
  protected states = new Set<State>();
  private stateProperty: keyof T;

  constructor(options: WorkflowOptions<T>) {
    this.detectUnexpectedState = options.detectUnexpectedState ?? false;
    this.stateProperty = options.stateProperty;
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

  private doDetectUnexpectedState(currentState: State) {
    if (this.detectUnexpectedState && !this.states.has(currentState)) {
      throw new Error(
        `The instance has an unexpected state '${currentState.toString()}'`
      );
    }
  }
}
