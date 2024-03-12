import {describe, it, expect, jest, spyOn} from "bun:test";
import { Delegate, DelegateError } from "./Delegate";

describe("Delegate tests", () => {

    it("passes multiple variables to a single handler", () => {
        const onPurchase = new Delegate<[count: number, price: number]>();

        let totalCost = 0;

        const databaseCallback = (a: number, b: number) => {
            totalCost = a * b;
        };

        onPurchase.addListener(databaseCallback);

        onPurchase(10, 20);
        expect(totalCost).toBe(200);
    });

    it("passes the correct values to callbacks with lesser arguments", () => {
        const onClick = new Delegate<[positionX: number, positionY: number]>();

        let clickX: number = 0;

        const callback = (x: number) => {
            clickX = x;
        };

        onClick.addListener(callback);

        onClick(100, 200);
        expect(clickX).toBe(100);
    });

    it("passes the correct values to multiple callbacks registered", () => {
        const onSelect = new Delegate<[option: string]>;

        let choiceState: string = "";

        const guiComponentCallback = (option: string) => {
            choiceState = option;
        };

        let databaseState: string = "";

        const databaseCallback = (option: string) => {
            databaseState = option;
        };

        onSelect
            .addListener(guiComponentCallback)
            .addListener(databaseCallback);

        onSelect("Dark Mode");

        expect(choiceState).toBe("Dark Mode");
        expect(databaseState).toBe("Dark Mode");
    });

    it("passes the correct value to the registered context", () => {
        const onMarker = new Delegate<[name: string, sampleOffset: number]>();

        class TimelineUI {
            displayMarkers: {name: string, sampleOffset: number}[];

            constructor() {
                this.displayMarkers = [];
            }

            handleMarkerCallback(name: string, sampleOffset: number) {
                this.displayMarkers.push({
                    name, sampleOffset
                });
            }
        }

        const timelineui = new TimelineUI();

        onMarker.addListener(timelineui.handleMarkerCallback, timelineui);

        onMarker("Section A", 123456);

        expect(timelineui.displayMarkers.length).toBe(1);
        if (timelineui.displayMarkers.length === 1) {
            expect(timelineui.displayMarkers[0].name).toBe("Section A");
            expect(timelineui.displayMarkers[0].sampleOffset).toBe(123456);
        }
    });

    it("passes the correct value to multiple registered contexts", () => {
        const onMarker = new Delegate<[name: string, sampleOffset: number]>();

        class TimelineUI {
            displayMarkers: {name: string, sampleOffset: number}[];

            constructor() {
                this.displayMarkers = [];
            }

            handleMarkerCallback(name: string, sampleOffset: number) {
                this.displayMarkers.push({
                    name, sampleOffset
                });
            }
        }

        const timelineui1 = new TimelineUI();
        const timelineui2 = new TimelineUI();

        onMarker
            .addListener(timelineui1.handleMarkerCallback, timelineui1)
            .addListener(timelineui2.handleMarkerCallback, timelineui2);

        onMarker("Section A", 123456);

        expect(timelineui1.displayMarkers.length).toBe(1);
        expect(timelineui2.displayMarkers.length).toBe(1);
        if (timelineui1.displayMarkers.length === 1) {
            expect(timelineui1.displayMarkers[0].name).toBe("Section A");
            expect(timelineui1.displayMarkers[0].sampleOffset).toBe(123456);
        }
        if (timelineui2.displayMarkers.length === 1) {
            expect(timelineui2.displayMarkers[0].name).toBe("Section A");
            expect(timelineui2.displayMarkers[0].sampleOffset).toBe(123456);
        }
    });

    it("throws DelegateError if adding self as a listener", () => {
        const d = new Delegate<[]>();
        expect(() => d.addListener(d)).toThrow(DelegateError);
    });

    it("throws DelegateError if invoked during a registered callback", () => {
        const d = new Delegate<[]>();

        const callback = () => {
            d();
        };

        d.addListener(callback);

        expect(() => d()).toThrow(DelegateError);
    });

    it("adds and removes a callback", () => {
        const onClick = new Delegate<[]>();

        let clicks = 0;
        const callback = jest.fn(() => {
            ++clicks;
        });

        onClick.addListener(callback);

        onClick();

        expect(clicks).toBe(1);
        expect(callback.mock.calls).toHaveLength(1);

        onClick.removeListener(callback);

        onClick();

        expect(clicks).toBe(1);
        expect(callback.mock.calls).toHaveLength(1);
    });

    it("adds and removes a callback with context", () => {
        const onClick = new Delegate<[]>();

        const mouseData = {
            clicks: 0
        };

        const callback = jest.fn(function(this: {clicks: number}) {
            ++this.clicks;
        });

        onClick.addListener(callback, mouseData);

        onClick();

        expect(mouseData.clicks).toBe(1);
        expect(callback.mock.calls).toHaveLength(1);

        onClick.removeListener(callback, mouseData);

        onClick();

        expect(mouseData.clicks).toBe(1);
        expect(callback.mock.calls).toHaveLength(1);
    });

    it("adds and removes a callback among several", () => {
        const onClick = new Delegate<[]>();

        let clicks1 = 0, clicks2 = 0, clicks3 = 0;
        const callback1 = jest.fn(() => {
            ++clicks1;
        });
        const callback2 = jest.fn(() => {
            ++clicks2;
        });
        const callback3 = jest.fn(() => {
            ++clicks3;
        });

        onClick
            .addListener(callback1)
            .addListener(callback2)
            .addListener(callback3);

        onClick();

        expect(clicks1).toBe(1);
        expect(callback1.mock.calls).toHaveLength(1);
        expect(clicks2).toBe(1);
        expect(callback2.mock.calls).toHaveLength(1);
        expect(clicks3).toBe(1);
        expect(callback3.mock.calls).toHaveLength(1);

        onClick.removeListener(callback2);

        onClick();

        expect(clicks1).toBe(2);
        expect(callback1.mock.calls).toHaveLength(2);
        expect(clicks2).toBe(1);
        expect(callback2.mock.calls).toHaveLength(1);
        expect(clicks3).toBe(2);
        expect(callback3.mock.calls).toHaveLength(2);
    });

    it("adds and removes a callback among several with contexts", () => {
        const onClick = new Delegate<[]>();

        class MouseData {
            clicks: number;
            constructor() {
                this.clicks = 0;
            }

            clickHandler() {
                ++this.clicks;
            }
        }

        const data1 = new MouseData;
        const data2 = new MouseData;
        const data3 = new MouseData;

        const spy1 = spyOn(data1, "clickHandler");
        const spy2 = spyOn(data2, "clickHandler");
        const spy3 = spyOn(data3, "clickHandler");

        onClick
            .addListener(data1.clickHandler, data1)
            .addListener(data2.clickHandler, data2)
            .addListener(data3.clickHandler, data3);

        onClick();

        expect(data1.clicks).toBe(1);
        expect(spy1).toHaveBeenCalledTimes(1);
        expect(data2.clicks).toBe(1);
        expect(spy2).toHaveBeenCalledTimes(1);
        expect(data3.clicks).toBe(1);
        expect(spy3).toHaveBeenCalledTimes(1);

        onClick.removeListener(data2.clickHandler, data2);

        onClick();

        expect(data1.clicks).toBe(2);
        expect(spy1).toHaveBeenCalledTimes(2);
        expect(data2.clicks).toBe(1);
        expect(spy2).toHaveBeenCalledTimes(1);
        expect(data3.clicks).toBe(2);
        expect(spy3).toHaveBeenCalledTimes(2);
    });
});

describe("Delegate async tests", () => {

    it("`Delegate#asyncSeq` executes callbacks and awaits each resolution sequentially", async () => {
        const results: number[] = [];
        const callback0 = async () => {
            results.push(0);
            return new Promise<void>(resolve => setTimeout(() => {
                results.push(1);
                resolve();
            }, 1));
        };

        const callback1 = async () => {
            results.push(2);
            return new Promise<void>(resolve => setTimeout(() => {
                results.push(3);
                resolve();
            }, 1));
        };

        const callback2 = async () => {
            results.push(4);
            return new Promise<void>(resolve => setTimeout(() => {
                results.push(5);
                resolve();
            }, 1));
        };

        const delegate = new Delegate();

        delegate
            .addListener(callback0)
            .addListener(callback1)
            .addListener(callback2);

        await delegate.asyncSeq();

        expect(results).toHaveLength(6);
        expect(results[0]).toBe(0);
        expect(results[1]).toBe(1);
        expect(results[2]).toBe(2);
        expect(results[3]).toBe(3);
        expect(results[4]).toBe(4);
        expect(results[5]).toBe(5);
    });


    it("`Delegate#asyncAll` executes callbacks in order, but resolves freely", async () => {
        const results: number[] = [];
        const callback0 = async () => {
            results.push(0);
            return new Promise<void>(resolve => setTimeout(() => {
                results.push(1);
                resolve();
            }, 100)); // FIXME: any way to guarantee these delay values are wide enough to resolve predictibly?
        };

        const callback1 = async () => {
            results.push(2);
            return new Promise<void>(resolve => setTimeout(() => {
                results.push(3);
                resolve();
            }, 50));
        };

        const callback2 = async () => {
            results.push(4);
            return new Promise<void>(resolve => setTimeout(() => {
                results.push(5);
                resolve();
            }, 1));
        };

        const delegate = new Delegate();

        delegate
            .addListener(callback0)
            .addListener(callback1)
            .addListener(callback2);

        await delegate.asyncAll();

        expect(results).toStrictEqual([0, 2, 4, 5, 3, 1]);
    });

    it("mixes async and sync callbacks in `Delegate#asyncSeq`, working as expected", async() => {
        const results: number[] = [];

        const asyncCallback = async () => {
            results.push(0);
            return new Promise<void>(resolve => {
                setTimeout(() => {
                    results.push(1);
                    resolve();
                }, 1);
            });
        };

        const syncCallback = () => {
            results.push(2);
            results.push(3);
        }

        const delegate = new Delegate();
        delegate
            .addListener(asyncCallback)
            .addListener(syncCallback)
            .addListener(asyncCallback)
            .addListener(syncCallback)

        await delegate.asyncSeq();

        expect(results).toStrictEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    });

    it("mixes async and sync callbacks in `Delegate#asyncAll`, working as expected", async() => {
        const results: number[] = [];

        const asyncCallback = async () => {
            results.push(0);
            return new Promise<void>(resolve => {
                setTimeout(() => {
                    results.push(1);
                    resolve();
                }, 10);
            });
        };

        const syncCallback = () => {
            results.push(2);
        }

        const delegate = new Delegate();
        delegate
            .addListener(asyncCallback)
            .addListener(syncCallback)
            .addListener(asyncCallback)
            .addListener(syncCallback)

        await delegate.asyncAll();

        expect(results).toStrictEqual([0, 2, 0, 2, 1, 1]);
    });

    it("defers `addListener` commands until after delegate invocation", () => {
        const delegate = new Delegate();
        const callback2 = jest.fn(() => {});

        let addedListener = false;
        const callback1 = jest.fn(() => {
            if (addedListener === false) {
                delegate.addListener(callback2);
                addedListener = true;
            }
        });

        delegate.addListener(callback1);

        delegate();

        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(0);

        delegate(); // callback1 okay to remove a listener that is no longer there

        expect(callback1).toHaveBeenCalledTimes(2);
        expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("defers `removeListener` commands until after delegate invocation", () => {
        const delegate = new Delegate();
        const callback2 = jest.fn(() => {});
        const callback1 = jest.fn(() => {
            delegate.removeListener(callback2);
        });

        delegate.addListener(callback1);
        delegate.addListener(callback2);

        delegate();

        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);

        delegate(); // callback1 okay to remove a listener that is no longer there

        expect(callback1).toHaveBeenCalledTimes(2);
        expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("works in an event emitter pattern", () => {
        class TrackManager {
            constructor() { }

            events = {
                onMarker: new Delegate<[name: string, timestamp: number]>(),
                onTrackEnd: new Delegate(),
                onTransition: new Delegate<[from: number, to: number]>()
            }
        }

        const track = new TrackManager();

        let markerData = {
            name: "",
            timestamp: -1
        };
        const displayMarker = jest.fn((name: string, timestamp: number) => {
            markerData = { name, timestamp }
        });

        track.events.onMarker.addListener(displayMarker);

        track.events.onMarker("Section A", 12345);

        expect(displayMarker).toHaveBeenCalledTimes(1);
        expect(markerData.name).toBe("Section A");
        expect(markerData.timestamp).toBe(12345);
    })
});
