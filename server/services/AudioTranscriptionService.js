const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const { whisper } = require('whisper-node');
const crypto = require('crypto');

// Configura o caminho do ffmpeg incluído no projeto, para não depender da máquina host
ffmpeg.setFfmpegPath(ffmpegStatic);

class AudioTranscriptionService {
  constructor() {
    this.modelName = 'base'; // Usa o modelo 'base' que equilibra velocidade/memória e acerto de sotaques
  }

  /**
   * Recebe um Base64 de um áudio OGG (WhatsApp), converte para WAV 16kHz e executa o Whisper STT
   * @param {string} base64Audio Áudio bruto do WhatsApp
   * @returns {Promise<string>} Texto transcrito
   */
  async transcribeAudioBase64(base64Audio) {
    return new Promise(async (resolve, reject) => {
      const sessionId = crypto.randomBytes(8).toString('hex');
      const tempOggPath = path.join(__dirname, `../temp_audio_${sessionId}.ogg`);
      const tempWavPath = path.join(__dirname, `../temp_audio_${sessionId}.wav`);

      try {
        // 1. Limpa o base64 (remove data:audio/ogg;base64, se existir)
        const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
        const audioBuffer = Buffer.from(base64Data, 'base64');

        // 2. Salva o OGG temporário
        fs.writeFileSync(tempOggPath, audioBuffer);

        // 3. Converte para WAV 16kHz Mono (exigência do Whisper)
        await new Promise((res, rej) => {
          ffmpeg(tempOggPath)
            .toFormat('wav')
            .audioChannels(1)
            .audioFrequency(16000)
            .on('error', (err) => rej(err))
            .on('end', () => res())
            .save(tempWavPath);
        });

        // 4. Executa o whisper-node
        // A primeira vez que rodar, ele fará o download do modelo `.bin` (aprox 150mb para base)
        const options = {
          modelName: this.modelName,
          whisperOptions: {
            language: 'pt', // Força PT para não perder tempo com auto-detect e evitar alucinação
            gen_file_txt: false,
            gen_file_subtitle: false,
            gen_file_vtt: false,
          }
        };

        const transcript = await whisper(tempWavPath, options);

        // Limpa os arquivos
        this._cleanup([tempOggPath, tempWavPath]);

        // Trata a string de saída. O Whisper às vezes retorna array ou string com timestamps [00:00:00.000 --> 00:00:05.000]. Depende da versão do wrapper extraímos apenas texto.
        let finalText = '';
        if (Array.isArray(transcript)) {
          finalText = transcript.map(t => t.speech || t.text).join(' ');
        } else if (typeof transcript === 'string') {
           // Algumas saídas raw do C++ vem sujas com tags do terminal
           finalText = transcript.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/g, '').trim();
        }

        resolve(finalText.trim());

      } catch (error) {
        console.error('[AudioTranscriptionService] Falha interna:', error);
        this._cleanup([tempOggPath, tempWavPath]);
        reject(error);
      }
    });
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
