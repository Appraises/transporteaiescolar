/**
 * Distância Haversine (linha reta) entre duas coordenadas em KM
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

class RoutingService {
  /**
   * Calcula a rota ótima resolvendo o TSP matematicamente
   * Usado Held-Karp para rotas de van normais (até 18) e Nearest Neighbor fallback para excesso.
   * Adaptado estruturalmente da referência base consolidada.
   * 
   * @param {Array} passageiros Array de objetos de Passageiro contendo .latitude e .longitude
   * @param {Object} coordsBase Coordenada da Base Inicial (Motorista) {lat, lng}
   * @returns {Object} Caminho otimizado da Rota e distância total
   */
  calculateOptimalRoute(passageiros, coordsBase) {
    const n = passageiros.length;
    if (n === 0) return { orderedPath: [], totalDistance: 0 };

    // Node 0 = base | Nodes 1..n = passageiros
    const coords = [
        { lat: coordsBase.lat, lng: coordsBase.lng },
        ...passageiros.map(p => ({ lat: p.latitude, lng: p.longitude }))
    ];
    const totalNodes = coords.length;

    // Matriz de distâncias
    const dist = Array.from({ length: totalNodes }, () => new Float64Array(totalNodes));
    for (let i = 0; i < totalNodes; i++) {
        for (let j = i + 1; j < totalNodes; j++) {
            const d = haversineDistance(coords[i].lat, coords[i].lng, coords[j].lat, coords[j].lng);
            dist[i][j] = d;
            dist[j][i] = d;
        }
    }

    let bestOrder; // Índices do array 'passageiros' excluso do Zero
    const isOptimal = n <= 18;

    if (isOptimal) {
        // HELD-KARP EXACT DP -> TSP Rápido e Ótimo
        const FULL = (1 << n) - 1;
        const INF = Infinity;

        const dp = Array.from({ length: 1 << n }, () => new Float64Array(n).fill(INF));
        const parent = Array.from({ length: 1 << n }, () => new Int8Array(n).fill(-1));

        for (let i = 0; i < n; i++) {
            dp[1 << i][i] = dist[0][i + 1];
        }

        for (let mask = 1; mask <= FULL; mask++) {
            for (let last = 0; last < n; last++) {
                if (!(mask & (1 << last))) continue;
                if (dp[mask][last] === INF) continue;

                for (let next = 0; next < n; next++) {
                    if (mask & (1 << next)) continue;
                    const newMask = mask | (1 << next);
                    const newDist = dp[mask][last] + dist[last + 1][next + 1];
                    if (newDist < dp[newMask][next]) {
                        dp[newMask][next] = newDist;
                        parent[newMask][next] = last;
                    }
                }
            }
        }

        let bestDist = INF;
        let bestLast = -1;
        for (let i = 0; i < n; i++) {
            const total = dp[FULL][i] + dist[i + 1][0]; // volta pra base
            if (total < bestDist) {
                bestDist = total;
                bestLast = i;
            }
        }

        const path = [];
        let mask = FULL;
        let cur = bestLast;
        while (cur !== -1) {
            path.push(cur);
            const prev = parent[mask][cur];
            mask ^= (1 << cur);
            cur = prev;
        }
        path.reverse();
        bestOrder = path;

    } else {
        // FALLBACK: Nearest Neighbor para Vans Lotação (> 18)
        const visited = new Set();
        const order = [];
        let currentNode = 0;

        while (order.length < n) {
            let nearest = -1;
            let minD = Infinity;
            for (let i = 0; i < n; i++) {
                if (visited.has(i)) continue;
                const d = dist[currentNode][i + 1];
                if (d < minD) {
                    minD = d;
                    nearest = i;
                }
            }
            if (nearest !== -1) {
                order.push(nearest);
                visited.add(nearest);
                currentNode = nearest + 1;
            }
        }
        
        // 2-opt Simples improvement
        const routeDist = (route) => {
            let d = dist[0][route[0] + 1];
            for (let i = 0; i < route.length - 1; i++) {
                d += dist[route[i] + 1][route[i + 1] + 1];
            }
            d += dist[route[route.length - 1] + 1][0];
            return d;
        };

        let improved = true;
        while (improved) {
            improved = false;
            for (let i = 0; i < order.length - 1; i++) {
                for (let j = i + 1; j < order.length; j++) {
                    const newRoute = [...order];
                    let left = i, right = j;
                    while (left < right) {
                        [newRoute[left], newRoute[right]] = [newRoute[right], newRoute[left]];
                        left++;
                        right--;
                    }
                    if (routeDist(newRoute) < routeDist(order)) {
                        for (let k = i; k <= j; k++) order[k] = newRoute[k];
                        improved = true;
                    }
                }
            }
        }
        bestOrder = order;
    }

    const orderedPath = bestOrder.map(i => passageiros[i]);
    
    return {
        orderedPath,
        isOptimal
    };
  }
}

module.exports = new RoutingService();
