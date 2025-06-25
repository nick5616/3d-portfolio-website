import { create } from 'zustand';

interface ActiveDisplay {
    id: string;
    title: string;
    openedAt: number;
    evictCallback: () => void;
}

interface DisplayManagerState {
    activeDisplays: ActiveDisplay[];
    maxActiveDisplays: number;
    
    // Actions
    registerDisplay: (id: string, title: string, evictCallback: () => void) => void;
    unregisterDisplay: (id: string) => void;
    updateDisplayActivity: (id: string) => void;
    getActiveDisplayCount: () => number;
    isDisplayActive: (id: string) => boolean;
}

export const useDisplayManager = create<DisplayManagerState>((set, get) => ({
    activeDisplays: [],
    maxActiveDisplays: 2,

    registerDisplay: (id: string, title: string, evictCallback: () => void) => {
        const state = get();
        const now = Date.now();
        
        // Check if display is already registered
        const existingIndex = state.activeDisplays.findIndex(display => display.id === id);
        
        if (existingIndex !== -1) {
            // Update existing display's activity
            set(state => ({
                activeDisplays: state.activeDisplays.map(display => 
                    display.id === id 
                        ? { ...display, openedAt: now, evictCallback }
                        : display
                )
            }));
        } else {
            // Add new display
            const newDisplay: ActiveDisplay = {
                id,
                title,
                openedAt: now,
                evictCallback
            };

            set(state => {
                let newActiveDisplays = [...state.activeDisplays, newDisplay];
                
                // If we exceed the limit, evict the least recently opened
                if (newActiveDisplays.length > state.maxActiveDisplays) {
                    // Sort by openedAt (oldest first)
                    const sortedDisplays = [...newActiveDisplays].sort((a, b) => a.openedAt - b.openedAt);
                    
                    // Evict the oldest display
                    const displayToEvict = sortedDisplays[0];
                    console.log(`🔄 Evicting display: ${displayToEvict.title} (opened at ${new Date(displayToEvict.openedAt).toLocaleTimeString()})`);
                    
                    // Call the evict callback to force the display back to screenshot mode
                    displayToEvict.evictCallback();
                    
                    // Remove the evicted display from active list
                    newActiveDisplays = newActiveDisplays.filter(display => display.id !== displayToEvict.id);
                }

                console.log(`📺 Active displays (${newActiveDisplays.length}/${state.maxActiveDisplays}):`, 
                    newActiveDisplays.map(d => `${d.title} (${new Date(d.openedAt).toLocaleTimeString()})`));

                return { activeDisplays: newActiveDisplays };
            });
        }
    },

    unregisterDisplay: (id: string) => {
        set(state => {
            const display = state.activeDisplays.find(d => d.id === id);
            if (display) {
                console.log(`❌ Unregistering display: ${display.title}`);
            }
            
            return {
                activeDisplays: state.activeDisplays.filter(display => display.id !== id)
            };
        });
    },

    updateDisplayActivity: (id: string) => {
        const state = get();
        const display = state.activeDisplays.find(d => d.id === id);
        
        if (display) {
            // Update the timestamp to mark as most recently used
            set(state => ({
                activeDisplays: state.activeDisplays.map(display => 
                    display.id === id 
                        ? { ...display, openedAt: Date.now() }
                        : display
                )
            }));
            
            console.log(`⏰ Updated activity for: ${display.title}`);
        }
    },

    getActiveDisplayCount: () => {
        return get().activeDisplays.length;
    },

    isDisplayActive: (id: string) => {
        return get().activeDisplays.some(display => display.id === id);
    }
}));