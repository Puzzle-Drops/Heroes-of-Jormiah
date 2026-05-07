class EventListenerManager {
    constructor() {
        this.listeners = [];
    }
    
    add(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        this.listeners.push({ element, event, handler, options });
    }
    
    remove(element, event, handler) {
        element.removeEventListener(event, handler);
        this.listeners = this.listeners.filter(
            l => !(l.element === element && l.event === event && l.handler === handler)
        );
    }
    
    removeAll() {
        this.listeners.forEach(({ element, event, handler }) => {
            try {
                element.removeEventListener(event, handler);
            } catch (e) {
                // Element might be gone, that's ok
            }
        });
        this.listeners = [];
    }
}

class AnimationManager {
    constructor() {
        this.activeFrames = new Set();
    }
    
    request(callback) {
        const id = requestAnimationFrame(callback);
        this.activeFrames.add(id);
        return id;
    }
    
    cancel(id) {
        if (id) {
            cancelAnimationFrame(id);
            this.activeFrames.delete(id);
        }
    }
    
    cancelAll() {
        this.activeFrames.forEach(id => {
            try {
                cancelAnimationFrame(id);
            } catch (e) {}
        });
        this.activeFrames.clear();
    }
}

class TimerManager {
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
    }
    
    setInterval(callback, delay) {
        const id = setInterval(callback, delay);
        this.intervals.add(id);
        return id;
    }
    
    setTimeout(callback, delay) {
        const id = setTimeout(() => {
            callback();
            this.timeouts.delete(id);
        }, delay);
        this.timeouts.add(id);
        return id;
    }
    
    clearInterval(id) {
        if (id) {
            clearInterval(id);
            this.intervals.delete(id);
        }
    }
    
    clearTimeout(id) {
        if (id) {
            clearTimeout(id);
            this.timeouts.delete(id);
        }
    }
    
    clearAll() {
        this.intervals.forEach(id => {
            try { clearInterval(id); } catch (e) {}
        });
        this.timeouts.forEach(id => {
            try { clearTimeout(id); } catch (e) {}
        });
        this.intervals.clear();
        this.timeouts.clear();
    }
}

