/** Registry for Camp controllers and ?shot= handlers (kept separate to avoid import cycles). */
import type { CampCtx } from './ctx';

export type ControllerFactory = (ctx: CampCtx) => { destroy?: () => void } | void;

export const controllerFactories: ControllerFactory[] = [];
export const shotHandlers = new Map<string, (ctx: CampCtx) => void | Promise<void>>();

/** Controllers that attach to every Camp instance. */
export function registerCampController(f: ControllerFactory): void {
  controllerFactories.push(f);
}

/** Shot handlers (?shot=<name>) for screenshots and tests. */
export function registerShot(name: string, fn: (ctx: CampCtx) => void | Promise<void>): void {
  shotHandlers.set(name, fn);
}
