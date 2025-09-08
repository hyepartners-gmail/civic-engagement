export const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(n);

export const fmtShort = (n: number) => {
    if (n === null || n === undefined) return 'N/A';
    if (Math.abs(n) >= 1e12) {
        return `${(n / 1e12).toFixed(2)}T`;
    }
    if (Math.abs(n) >= 1e9) {
        return `${(n / 1e9).toFixed(1)}B`;
    }
    if (Math.abs(n) >= 1e6) {
        return `${(n / 1e6).toFixed(1)}M`;
    }
    if (Math.abs(n) >= 1e3) {
        return `${(n / 1e3).toFixed(0)}k`;
    }
    return n.toFixed(0);
};

export const fmtPct = (p: number) => {
    if (p === null || p === undefined) return 'N/A';
    return `${(p * 100).toFixed(1)}%`;
}

export const round = (n: number, d = 0) => Math.round(n * (10 ** d)) / (10 ** d);