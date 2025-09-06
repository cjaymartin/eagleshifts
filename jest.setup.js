// Jest setup file
require('jest-environment-jsdom');

// Mock Next.js router
jest.mock('next/router', () => ({
    useRouter() {
        return {
            route: '/',
            pathname: '/',
            query: {},
            asPath: '/',
            push: jest.fn(),
            pop: jest.fn(),
            reload: jest.fn(),
            back: jest.fn(),
            prefetch: jest.fn().mockResolvedValue(undefined),
            beforePopState: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
                emit: jest.fn(),
            },
        };
    },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
        };
    },
    useSearchParams() {
        return new URLSearchParams();
    },
    usePathname() {
        return '/';
    },
}));

// Mock problematic ES modules
jest.mock('react-leaflet', () => ({
    MapContainer: 'div',
    TileLayer: 'div',
    Marker: 'div',
    Popup: 'div',
}));

jest.mock('leaflet', () => {
    const MockMarker = function () {};
    MockMarker.prototype = {
        options: {
            icon: null,
        },
    };

    return {
        icon: jest.fn(),
        divIcon: jest.fn(),
        Marker: MockMarker,
    };
});

// Mock HTML canvas and PDF libraries
jest.mock('html2pdf.js', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        from: jest.fn().mockReturnThis(),
        save: jest.fn().mockResolvedValue(undefined),
        toPdf: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnValue('mock-pdf-data'),
    })),
}));

jest.mock('jspdf', () => ({
    jsPDF: jest.fn().mockImplementation(() => ({
        text: jest.fn(),
        save: jest.fn(),
        addImage: jest.fn(),
        setFontSize: jest.fn(),
    })),
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});
