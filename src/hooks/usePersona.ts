interface Persona {
    name: string;
    isNicole: boolean;
}

export const usePersona = (): Persona => {
    const hostname = window.location.hostname;
    const isNicole = hostname.includes("nicolebelovoskey") || hostname.includes("localhost");
    return {
        name: isNicole ? "Nicole" : "Nick",
        isNicole: isNicole,
    };
};
