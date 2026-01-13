let messages: { message: string; consoleFn: (message: string) => void }[] = [];

const setConsoleMessage = (message: string, consoleFn: (message: string) => void) => {
    messages.push({ message, consoleFn });
};

export const consoleError = (message: string) => setConsoleMessage(message, console.error);
export const consoleWarn = (message: string) => setConsoleMessage(message, console.warn);
