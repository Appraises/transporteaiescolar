import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { AlertTriangle, CheckCircle, GraduationCap, MapPin, Navigation, User } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const RAIO_PASSAGEIRO = 50; // metros
const RAIO_ESCOLA = 150; // metros

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const earthRadiusMeters = 6371e3;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const Directions = ({ origin, destination }) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);

  useEffect(() => {
    if (!routesLibrary || !map) {
      return undefined;
    }

    const renderer = new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true
    });

    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) {
      return;
    }

    directionsService
      .route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING
      })
      .then((response) => {
        directionsRenderer.setDirections(response);
      })
      .catch((error) => {
        console.error('Directions request failed', error);
      });
  }, [destination, directionsRenderer, directionsService, origin]);

  return null;
};

export default function RotaAtivaPage() {
  const [viagem, setViagem] = useState(null);
  const [rota, setRota] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [distanciaEscola, setDistanciaEscola] = useState(null);

  const wakeLockRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastSyncTimeRef = useRef(0);

  const loadViagem = useCallback(async () => {
    try {
      const response = await axios.get('/api/viagens/ativa');
      if (response.data.viagem) {
        setViagem(response.data.viagem);
        setRota(response.data.rota || []);
      } else {
        setViagem(null);
        setRota([]);
      }
      setError('');
    } catch (requestError) {
      console.error('Erro ao buscar viagem ativa', requestError);
      setError('Falha ao carregar a rota ativa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViagem();

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (wakeLockError) {
        console.warn('Wake Lock nao suportado ou negado:', wakeLockError);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [loadViagem]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalizacao nao suportada pelo navegador.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setDriverLocation(nextLocation);

        const now = Date.now();
        if (now - lastSyncTimeRef.current < 10000) {
          return;
        }

        lastSyncTimeRef.current = now;
        axios
          .post('/api/viagens/ativa/sync-localizacao', nextLocation)
          .catch((syncError) => {
            console.error('Erro no sync-localizacao', syncError);
          });
      },
      (geoError) => {
        console.error('Erro de GPS', geoError);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    );
  }, []);

  const handleAvancar = useCallback(
    async (auto = false) => {
      if (isAdvancing) {
        return;
      }

      setIsAdvancing(true);
      try {
        await axios.post('/api/viagens/ativa/avancar');
        await loadViagem();
      } catch (requestError) {
        console.error('Erro ao avancar parada', requestError);
        if (!auto) {
          alert('Erro ao registrar a parada.');
        }
      } finally {
        setIsAdvancing(false);
      }
    },
    [isAdvancing, loadViagem]
  );

  // Finaliza a viagem ao chegar na escola
  const handleFinalizarViagem = useCallback(async () => {
    if (isFinalizing) {
      return;
    }

    setIsFinalizing(true);
    try {
      await axios.post('/api/viagens/ativa/finalizar');
      await loadViagem();
    } catch (requestError) {
      console.error('Erro ao finalizar viagem', requestError);
    } finally {
      setIsFinalizing(false);
    }
  }, [isFinalizing, loadViagem]);

  // Geofence: avanço automático de paradas (passageiros)
  useEffect(() => {
    if (!viagem || !driverLocation || rota.length === 0 || isAdvancing) {
      return;
    }

    if (viagem.status === 'indo_para_escola' || viagem.status === 'finalizada') {
      return;
    }

    const paradaAtualIndex = (viagem.parada_atual || 1) - 1;
    if (paradaAtualIndex >= rota.length) {
      return;
    }

    const proximoPassageiro = rota[paradaAtualIndex]?.passageiro;
    const targetLat = Number(proximoPassageiro?.latitude);
    const targetLng = Number(proximoPassageiro?.longitude);

    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) {
      return;
    }

    const distancia = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      targetLat,
      targetLng
    );

    if (distancia < RAIO_PASSAGEIRO) {
      handleAvancar(true);
    }
  }, [driverLocation, handleAvancar, isAdvancing, rota, viagem]);

  // Geofence: chegada na escola — finaliza a viagem
  useEffect(() => {
    if (!viagem || !driverLocation || isFinalizing) {
      return;
    }

    if (viagem.status !== 'indo_para_escola') {
      return;
    }

    const escola = viagem.escola;
    if (!escola || !escola.latitude || !escola.longitude) {
      return;
    }

    const distancia = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      Number(escola.latitude),
      Number(escola.longitude)
    );

    setDistanciaEscola(Math.round(distancia));

    if (distancia < RAIO_ESCOLA) {
      handleFinalizarViagem();
    }
  }, [driverLocation, handleFinalizarViagem, isFinalizing, viagem]);

  if (loading) {
    return <div className="p-4 text-center">Carregando rota...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded flex items-center gap-2">
        <AlertTriangle />
        {error}
      </div>
    );
  }

  if (!viagem) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-[var(--color-text)]">Nenhuma rota ativa</h2>
        <p className="text-gray-500">Voce nao possui nenhuma viagem em andamento no momento.</p>
      </div>
    );
  }

  // ── Fase: indo para escola ──
  const isIndoParaEscola = viagem.status === 'indo_para_escola';
  const escola = viagem.escola;

  // ── Fase: finalizada ──
  const isFinalizada = viagem.status === 'finalizada';

  // ── Fase: coletando passageiros ──
  const isColetando = !isIndoParaEscola && !isFinalizada;

  const paradaAtualIndex = (viagem.parada_atual || 1) - 1;
  const proximoPassageiro = isColetando && paradaAtualIndex < rota.length ? rota[paradaAtualIndex]?.passageiro : null;
  const targetLat = Number(proximoPassageiro?.latitude);
  const targetLng = Number(proximoPassageiro?.longitude);
  const hasGoogleMapsKey = Boolean(GOOGLE_MAPS_API_KEY);
  const trechoAtualLabel = viagem.trecho_ativo === 'ida' ? 'Ida' : 'Volta';
  const visibleStops = isColetando ? rota.slice(paradaAtualIndex, paradaAtualIndex + 3) : [];
  const remainingStops = isColetando ? Math.max(0, rota.length - paradaAtualIndex - visibleStops.length) : 0;

  // Destino: escola (se indo_para_escola) ou próximo passageiro
  let destination = null;
  if (isIndoParaEscola && escola?.latitude && escola?.longitude) {
    destination = { lat: Number(escola.latitude), lng: Number(escola.longitude) };
  } else if (isColetando && Number.isFinite(targetLat) && Number.isFinite(targetLng)) {
    destination = { lat: targetLat, lng: targetLng };
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 relative">
      <div className="flex-1 w-full relative bg-gray-200">
        {hasGoogleMapsKey ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultZoom={15}
              defaultCenter={driverLocation || destination || { lat: -23.5505, lng: -46.6333 }}
              center={driverLocation || undefined}
              mapId="rota_ativa_map"
              disableDefaultUI
            >
              {driverLocation && (
                <AdvancedMarker position={driverLocation}>
                  <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white relative z-50">
                    <Navigation size={20} className="transform rotate-45" />
                  </div>
                </AdvancedMarker>
              )}

              {destination && !isIndoParaEscola && (
                <AdvancedMarker position={destination}>
                  <div className="bg-orange-500 text-white p-2 rounded-full shadow-lg border-2 border-white">
                    <User size={20} />
                  </div>
                </AdvancedMarker>
              )}

              {destination && isIndoParaEscola && (
                <AdvancedMarker position={destination}>
                  <div className="bg-emerald-600 text-white p-2 rounded-full shadow-lg border-2 border-white animate-pulse">
                    <GraduationCap size={20} />
                  </div>
                </AdvancedMarker>
              )}

              {driverLocation && destination && (
                <Directions origin={driverLocation} destination={destination} />
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100">
            <div className="max-w-xl mx-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-6 py-5 text-yellow-900 shadow-sm">
              <p className="font-semibold">Mapa indisponivel no momento</p>
              <p className="mt-2 text-sm leading-6">
                Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> para visualizar o mapa ao vivo.
                A rota e os controles abaixo continuam funcionando normalmente.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="liquid-route-panel absolute right-3 top-3 z-10 w-[min(17.5rem,calc(100%-0.75rem))] rounded-2xl p-2.5">
        {isFinalizada ? (
          <div className="py-4 text-center">
            <div className="relative mx-auto mb-3 w-14 h-14 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
              <CheckCircle size={40} className="text-green-500 relative z-10" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Viagem concluída!</h3>
            <p className="text-gray-500 text-xs mt-1">
              Todos os passageiros foram atendidos.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-200/60">
              <p className="text-[11px] text-slate-500">
                {rota.length} passageiro(s) na rota
              </p>
            </div>
          </div>
        ) : isIndoParaEscola ? (
          <div className="py-3 text-center">
            <div className="relative mx-auto mb-3 w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="bg-emerald-600 text-white p-2.5 rounded-full relative z-10">
                <GraduationCap size={22} />
              </div>
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-[0.18em] mb-1">
              Destino final
            </p>
            <h3 className="text-[14px] font-bold text-slate-900">
              Indo para {escola?.nome || 'Escola'}
            </h3>
            <p className="text-slate-500 text-xs mt-1.5">
              Todos os passageiros foram coletados ✓
            </p>

            {distanciaEscola !== null && (
              <div className="mt-3 pt-3 border-t border-slate-200/60">
                <p className="text-[13px] font-semibold text-emerald-700">
                  {distanciaEscola >= 1000
                    ? `${(distanciaEscola / 1000).toFixed(1)} km`
                    : `${distanciaEscola} m`}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  distância restante
                </p>
              </div>
            )}

            <p className="mt-3 text-[10px] text-slate-400">
              Finaliza automaticamente ao chegar na escola.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start gap-2.5">
              <div>
                <p className="text-[11px] font-semibold text-orange-500 uppercase tracking-[0.18em] mb-1">
                  Ordem da rota
                </p>
                <p className="text-[13px] font-semibold text-slate-900">
                  {viagem.parada_atual}/{rota.length} parada(s)
                </p>
              </div>
              <div className="liquid-route-chip rounded-full px-3 py-1 text-xs font-bold text-blue-700">
                {trechoAtualLabel}
              </div>
            </div>

            <ol className="mt-2.5 list-none space-y-1.5 p-0">
              {visibleStops.map((stop, index) => {
                const isCurrentStop = index === 0;

                return (
                  <li
                    key={stop.viagemPassageiroId}
                    className={`liquid-route-card rounded-xl px-2.5 py-2 ${
                      isCurrentStop
                        ? 'liquid-route-card--current'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          isCurrentStop
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/60 text-slate-700'
                        }`}
                      >
                        {stop.ordem}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[12.5px] font-semibold text-slate-900">
                            {stop.passageiro?.nome}
                          </p>
                          {isCurrentStop && (
                            <span className="rounded-full bg-green-100/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                              Agora
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-start gap-1 text-slate-500">
                          <MapPin size={11} className="mt-0.5 flex-shrink-0" />
                          <span className="text-[11px] line-clamp-2">{stop.passageiro?.enderecoFormatado}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {remainingStops > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                +{remainingStops} parada(s) depois desta.
              </p>
            )}

            <p className="mt-2.5 text-[11px] text-slate-600">
              Atualiza automaticamente ao entrar no raio da próxima parada.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
