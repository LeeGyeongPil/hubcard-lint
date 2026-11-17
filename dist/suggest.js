// 가까운 올바른 값 제안: "text-generations" → "text-generation", "Apache 2.0" → "apache-2.0".
// 1) 정규화(소문자·앞뒤 공백 제거·공백/밑줄 → 하이픈)해서 정확히 같으면 그 값
// 2) 아니면 편집 거리가 가장 작은 후보 하나(짧은 값은 1, 그 밖은 2 이하만). 멀면 제안하지 않는다.
export function normalize(value) {
    return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}
export function suggest(value, candidates) {
    if (typeof value !== "string" || value.trim() === "")
        return undefined;
    const norm = normalize(value);
    for (const c of candidates) {
        if (normalize(c) === norm && c !== value)
            return c;
    }
    const maxDistance = norm.length <= 4 ? 1 : 2;
    let best;
    let bestDistance = maxDistance + 1;
    for (const c of candidates) {
        const d = editDistance(norm, normalize(c), bestDistance);
        if (d < bestDistance) {
            best = c;
            bestDistance = d;
        }
    }
    return best !== undefined && best !== value ? best : undefined;
}
/** 레벤슈타인 거리. limit 이상이 확실하면 일찍 멈춘다(후보 수백 개를 빠르게 훑기 위해). */
export function editDistance(a, b, limit = Infinity) {
    if (Math.abs(a.length - b.length) >= limit)
        return limit;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
            cur.push(v);
            if (v < rowMin)
                rowMin = v;
        }
        if (rowMin >= limit)
            return limit;
        prev = cur;
    }
    return prev[b.length];
}
