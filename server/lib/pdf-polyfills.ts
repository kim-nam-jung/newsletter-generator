/* eslint-disable @typescript-eslint/no-explicit-any */

import { Image, createCanvas } from '@napi-rs/canvas';

// window polyfill
if (typeof window === 'undefined') {
    (global as any).window = global;
}

// document polyfill
if (typeof document === 'undefined') {
    (global as any).document = {
        createElement: (tagName: string) => {
            if (tagName.toLowerCase() === 'img') {
                return new Image();
            }
            if (tagName.toLowerCase() === 'canvas') {
                return createCanvas(1, 1);
            }
            return {};
        },
        head: {},
        body: {},
    };
}

// Image polyfill
if (!global.Image) {
    (global as any).Image = Image;
}
if ((global as any).window && !(global as any).window.Image) {
    (global as any).window.Image = Image;
}

// requestAnimationFrame polyfill
if (!global.requestAnimationFrame) {
    (global as any).requestAnimationFrame = (callback: any) => setTimeout(callback, 0);
}
if (!global.cancelAnimationFrame) {
    (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
}
if ((global as any).window && !(global as any).window.requestAnimationFrame) {
    (global as any).window.requestAnimationFrame = (global as any).requestAnimationFrame;
    (global as any).window.cancelAnimationFrame = (global as any).cancelAnimationFrame;
}

// Promise.withResolvers polyfill
if (typeof Promise.withResolvers === 'undefined') {
    // @ts-expect-error Polyfill for Promise.withResolvers which might be missing in older Node types
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

// Promise.try polyfill
if (typeof (Promise as any).try === 'undefined') {
    (Promise as any).try = function (func: any) {
        return new Promise((resolve, reject) => {
            try {
                resolve(func());
            } catch (e) {
                reject(e);
            }
        });
    };
}

console.log('[PDF Polyfills] Applied @napi-rs/canvas polyfills');
