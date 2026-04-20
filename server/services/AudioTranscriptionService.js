const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { GoogleGenAI } = require('@google/genai');
const GeminiQueueService = require('./GeminiQueueService');
const crypto = require('crypto');

// Configura o caminho do ffmpeg incluído no projeto
ffmpeg.setFfmpegPath(ffmpegStatic);

class AudioTranscriptionService {
  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Recebe um Base64 de um áudio OGG (WhatsApp), converte para WAV 16kHz e executa a transcrição via Gemini 1.5 Flash
   * @param {string} base64Audio Áudio bruto do WhatsApp
   * @returns {Promise<string>} Texto transcrito
   */
  async transcribeAudioBase64(base64Audio) {
    if (!process.env.GEMINI_API_KEY) {
        console.error('[AudioTranscriptionService] GEMINI_API_KEY ausente.');
        return '';
    }

    const sessionId = crypto.randomBytes(8).toString('hex');
    const tempOggPath = path.join(__dirname, `../temp_audio_${sessionId}.ogg`);
    const tempWavPath = path.join(__dirname, `../temp_audio_${sessionId}.wav`);

    try {
      // 1. Limpa o base64
      const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
      const audioBuffer = Buffer.from(base64Data, 'base64');

      // 2. Salva o OGG temporário
      fs.writeFileSync(tempOggPath, audioBuffer);

      // 3. Converte para WAV 16kHz Mono (Ideal para transcrição AI)
      await new Promise((res, rej) => {
        ffmpeg(tempOggPath)
          .toFormat('wav')
          .audioChannels(1)
          .audioFrequency(16000)
          .on('error', (err) => rej(err))
          .on('end', () => res())
          .save(tempWavPath);
      });

      // 4. Executa a transcrição com Gemini
      const audioBase64 = fs.readFileSync(tempWavPath).toString('base64');
      
      console.log(`[AudioTranscriptionService] Enfileirando áudio para Gemini 2.5 Flash...`);
      
      const response = await GeminiQueueService.enqueue(() => 
        this.genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
              {
                  parts: [
                      { text: "Transcreva este áudio de WhatsApp exatamente como dito. Retorne APENAS o texto da transcrição, sem comentários ou formatação adicional." },
                      {
                          inlineData: {
                              mimeType: "audio/wav",
                              data: audioBase64
                          }
                      }
                  ]
              }
          ]
        })
      );

      const transcript = response.text;
      console.log(`[AudioTranscriptionService] Transcrição concluída: "${transcript.substring(0, 50)}..."`);

      // Limpa os arquivos
      this._cleanup([tempOggPath, tempWavPath]);

      return transcript.trim();

    } catch (error) {
      console.error('[AudioTranscriptionService] Falha na transcrição via Gemini:', error);
      this._cleanup([tempOggPath, tempWavPath]);
      return '';
    }
  }

  _cleanup(filePaths) {
    filePaths.forEach(fp => {
      try {
        if (fs.existsSync(fp)) {
          fs.unlinkSync(fp);
        }
      } catch (e) {
        console.warn(`[Audio] Não foi possível apagar arquivo temporário ${fp}`, e.message);
      }
    });
  }
}

module.exports = new AudioTranscriptionService();
