# Delegate.ts

A simple event emitter with TypeScript inference

#### Code preview

```typescript
const onDataProcessed = new Delegate<[data: Uint8Array]>();

// adding a module or global-scoped callback
const processData = function(data: Uint8Array) {
    // ... process data ...
};

onDataProcessed.addListener(processData);

// notify listeners with data
onDataProcessed(new Uint8Array(...));
```

*Adding a member function callback*
```typescript
// arbitrary class
class DataReceiver {
    constructor() { }

    handleData(data: Uint8Array) {
        // ... process data ...
    }
}
const dataReceiver = new DataReceiver();

// specify `this` context as the second argument
onDataProcessed.addListener(dataReceiver.handleData, dataReceiver);
```

*Asynchronous call*
```typescript
// await each async callback sequentially
await onDataProcessed.asyncSeq(new Uint8Array(...));

// allow each async callback to resolve freely
await onDataProcessed.asyncAll(new Uint8Array(...));
```

*Delegate group*
```typescript
// object literal pattern is recommended for type inference
const trackEvents = {
    onMarker: new Delegate<[name: string, timestamp: number]>(),
    onTrackEnd: new Delegate(),
    onTransition: new Delegate<[from: number, to: number]>()
};

// or in a class

class TrackManager {
    constructor() { }

    events = {
        onMarker: new Delegate<[name: string, timestamp: number]>(),
        onTrackEnd: new Delegate(),
        onTransition: new Delegate<[from: number, to: number]>()
    }
}
```

Please read the `Delegate.ts` and `Delegate.test.ts` files for further information on usage.

#### Installation

```bash
npm install delegate.ts
```
##### Non-npm methods
1. TypeScript Project
- Download & drop `Delegate.ts` into a TypeScript project

2. JavaScript Project
- Clone the repo, run either `tsc` in the root directory, or `bun i && bun run build`
- Drop the built `dist/Delegate.js` into your project.

#### Compatibility

- Works in node, bun, browser, etc.
- Requires an ES6+ environment, due to the use of `Proxy` and `Promise`

#### Development

Bun is used for testing

To install dev dependencies:

```bash
bun install
```

To run tests:

```bash
bun test
```

To build:

```bash
bun run build
```
