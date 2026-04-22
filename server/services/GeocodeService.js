const axios = require('axios');

class GeocodeService {
  /**
   * Converte um endereço em texto para Latitude e Longitude
   * via API de Geocoding do Google Maps.
   * @param {string} address Endereço completo (Rua, Número, Bairro, Cidade)
   * @returns {Promise<{lat: number, lng: number} | null>}
   */
  async getCoordinates(address) {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.warn('[GeocodeService] GOOGLE_MAPS_API_KEY ausente. Usando Mock de coordenadas.');
      // Retorna Mock no Centro de São Paulo para testes locais
      return { lat: -23.550520, lng: -46.633308 };
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY,
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;
        
        // Tenta extrair o bairro dos address_components
        let neighborhood = null;
        if (result.address_components) {
          const bairroComp = result.address_components.find(c => 
            c.types.includes('sublocality_level_1') || 
            c.types.includes('neighborhood') || 
            c.types.includes('sublocality')
          );
          if (bairroComp) neighborhood = bairroComp.long_name;
        }

        return {
          lat: location.lat,
          lng: location.lng,
          neighborhood: neighborhood
        };
      }
      
      console.warn('[GeocodeService] Endereço não encontrado:', address);
      return null;
    } catch (error) {
      console.error('[GeocodeService] Erro ao conectar com Google Geocode API:', error);
      return null;
    }
  }
}

module.exports = new GeocodeService();
